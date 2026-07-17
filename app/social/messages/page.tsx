"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CheckCheck, Image as ImageIcon, Send, Trash2, Users } from "lucide-react";
import { authFetch } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import SocialNav from "../../components/SocialNav";

type Conversation = {
  id: number;
  other_user_id: number;
  other_display_name: string;
  other_photo_url: string;
  other_online: boolean;
  last_content: string;
  last_type: string;
  last_sender_id: number;
  unread_count: number;
  last_message_at: string;
};

type Message = {
  id: number;
  sender_user_id: number;
  message_type: string;
  content: string;
  media_url: string;
  created_at: string;
  sender_name?: string;
};

function MessagesInner() {
  const searchParams = useSearchParams();
  const [me, setMe] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherReadUpTo, setOtherReadUpTo] = useState(0);
  const [otherTyping, setOtherTyping] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = conversations.find((item) => item.id === activeId) || null;

  const loadConversations = useCallback(() => {
    authFetch("/social/messages/conversations", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => Array.isArray(rows) && setConversations(rows))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback((conversationId: number) => {
    authFetch(`/social/messages/conversations/${conversationId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setMessages(data.messages || []);
        const reads = (data.reads || []).map((r: any) => Number(r.last_read_message_id) || 0);
        setOtherReadUpTo(reads.length ? Math.max(...reads) : 0);
        const last = (data.messages || []).slice(-1)[0];
        if (last) {
          authFetch(`/social/messages/conversations/${conversationId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ last_message_id: last.id }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Identité + conversations + ouverture directe via ?c=<id>
  useEffect(() => {
    const stored = localStorage.getItem("user") || localStorage.getItem("client_user");
    if (stored) setMe(Number(JSON.parse(stored)?.id) || null);
    loadConversations();
    const wanted = Number(searchParams?.get("c"));
    if (wanted) setActiveId(wanted);
  }, [loadConversations, searchParams]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    setOtherTyping(false);
  }, [activeId, loadMessages]);

  // Temps réel + fallback polling quand le socket est déconnecté.
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);
      const onNew = (payload: any) => {
        loadConversations();
        if (payload.conversation_id === activeId) {
          setMessages((current) => [...current, payload.message]);
          authFetch(`/social/messages/conversations/${activeId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ last_message_id: payload.message.id }),
          }).catch(() => {});
        }
      };
      const onRead = (payload: any) => {
        if (payload.conversation_id === activeId) {
          setOtherReadUpTo((current) => Math.max(current, Number(payload.last_message_id) || 0));
        }
      };
      const onTyping = (payload: any) => {
        if (payload.conversation_id === activeId) setOtherTyping(payload.typing === true);
      };
      const onDeleted = (payload: any) => {
        if (payload.conversation_id === activeId) {
          setMessages((current) =>
            current.map((item) =>
              item.id === payload.message_id
                ? { ...item, message_type: "deleted", content: "", media_url: "" }
                : item
            )
          );
        }
      };
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("message:new", onNew);
      socket.on("message:read", onRead);
      socket.on("typing", onTyping);
      socket.on("message:deleted", onDeleted);
      setConnected(socket.connected);
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("message:new", onNew);
        socket.off("message:read", onRead);
        socket.off("typing", onTyping);
        socket.off("message:deleted", onDeleted);
      };
    }
  }, [activeId, loadConversations]);

  useEffect(() => {
    if (connected) return;
    const interval = setInterval(() => {
      loadConversations();
      if (activeId) loadMessages(activeId);
    }, 10000);
    return () => clearInterval(interval);
  }, [connected, activeId, loadConversations, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const notifyTyping = () => {
    const socket = getSocket();
    if (!socket || !activeId) return;
    socket.emit("typing", { conversation_id: activeId, typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socket.emit("typing", { conversation_id: activeId, typing: false }),
      2500
    );
  };

  const send = async (extra?: { message_type: string; media_url: string }) => {
    if (!activeId || sending) return;
    const content = input.trim();
    if (!content && !extra) return;
    setSending(true);
    try {
      const response = await authFetch(`/social/messages/conversations/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, ...(extra || {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.message) {
        setInput("");
        setMessages((current) =>
          current.some((item) => item.id === data.message.id) ? current : [...current, data.message]
        );
        loadConversations();
      }
    } catch {
      /* le polling rattrapera */
    }
    setSending(false);
  };

  const sendImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeId) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("photo", file);
      const response = await authFetch("/upload-user-photo", { method: "POST", body: uploadData });
      const data = await response.json().catch(() => ({}));
      if (data.profile_image_url) {
        await send({ message_type: "image", media_url: data.profile_image_url });
      }
    } catch {
      /* ignore */
    }
    setUploading(false);
  };

  const removeMessage = async (messageId: number) => {
    await authFetch(`/social/messages/${messageId}`, { method: "DELETE" }).catch(() => {});
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, message_type: "deleted", content: "", media_url: "" } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-3xl px-0 py-0 md:px-3 md:py-4">
        <div className="flex h-[calc(100dvh-115px)] overflow-hidden bg-white md:h-[calc(100dvh-140px)] md:rounded-2xl md:shadow">
          {/* Liste des conversations */}
          <section
            className={`${active ? "hidden md:flex" : "flex"} w-full flex-col border-r border-gray-100 md:w-2/5`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-3.5">
              <h1 className="text-lg font-black text-black">Messages</h1>
              <Link href="/social/amis" aria-label="Mes amis" className="rounded-xl bg-gray-100 p-2 text-gray-600">
                <Users size={18} />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="font-semibold text-gray-500">Aucune conversation.</p>
                  <Link
                    href="/social/decouvrir"
                    className="mt-3 inline-block rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-black text-black"
                  >
                    Découvrir des personnes
                  </Link>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveId(conversation.id)}
                    className={`flex w-full items-center gap-3 border-b border-gray-50 p-3 text-left ${
                      activeId === conversation.id ? "bg-yellow-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="relative shrink-0">
                      {conversation.other_photo_url ? (
                        <img src={conversation.other_photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] font-black text-white">
                          {(conversation.other_display_name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      {conversation.other_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-black text-black">
                        {conversation.other_display_name || "Conversation"}
                      </span>
                      <span className="block truncate text-sm text-gray-500">
                        {conversation.last_type === "image"
                          ? "📷 Photo"
                          : conversation.last_content || "Nouvelle conversation"}
                      </span>
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
                        {conversation.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Fil de discussion */}
          <section className={`${active ? "flex" : "hidden md:flex"} w-full flex-col md:w-3/5`}>
            {!active ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-gray-400">
                Sélectionnez une conversation.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 p-3">
                  <button onClick={() => setActiveId(null)} aria-label="Retour" className="md:hidden">
                    <ArrowLeft size={20} className="text-gray-600" />
                  </button>
                  <Link href={`/social/profile/${active.other_user_id}`} className="flex min-w-0 items-center gap-2.5">
                    {active.other_photo_url ? (
                      <img src={active.other_photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] text-sm font-black text-white">
                        {(active.other_display_name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-black text-black">{active.other_display_name}</span>
                      <span className="block text-xs text-gray-400">
                        {otherTyping ? "écrit..." : active.other_online ? "en ligne" : ""}
                      </span>
                    </span>
                  </Link>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
                  {messages.map((message) => {
                    const mine = message.sender_user_id === me;
                    return (
                      <div key={message.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`relative max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] ${
                            message.message_type === "deleted"
                              ? "bg-gray-200 italic text-gray-400"
                              : mine
                                ? "bg-yellow-500 text-black"
                                : "bg-white text-black shadow-sm"
                          }`}
                        >
                          {message.message_type === "deleted" ? (
                            "Message supprimé"
                          ) : (
                            <>
                              {message.message_type === "image" && message.media_url && (
                                <img src={message.media_url} alt="" className="mb-1 max-h-60 rounded-xl object-cover" />
                              )}
                              {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                            </>
                          )}
                          <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-black/40">
                            {new Date(message.created_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {mine && message.message_type !== "deleted" &&
                              (message.id <= otherReadUpTo ? (
                                <CheckCheck size={13} className="text-blue-600" />
                              ) : (
                                <Check size={13} />
                              ))}
                          </span>
                          {mine && message.message_type !== "deleted" && (
                            <button
                              onClick={() => removeMessage(message.id)}
                              aria-label="Supprimer"
                              className="absolute -left-7 top-1.5 hidden text-gray-300 hover:text-red-500 group-hover:block"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 p-2.5">
                  <label className="cursor-pointer rounded-xl bg-gray-100 p-2.5 text-gray-500" aria-label="Envoyer une photo">
                    <ImageIcon size={19} />
                    <input type="file" accept="image/*" onChange={sendImage} className="hidden" />
                  </label>
                  <input
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      notifyTyping();
                    }}
                    onKeyDown={(event) => event.key === "Enter" && send()}
                    placeholder={uploading ? "Envoi de la photo..." : "Écrire un message..."}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] text-black"
                    maxLength={5000}
                  />
                  <button
                    onClick={() => send()}
                    disabled={sending || (!input.trim() && !uploading)}
                    aria-label="Envoyer"
                    className="rounded-xl bg-yellow-500 p-2.5 font-black text-black disabled:opacity-50"
                  >
                    <Send size={19} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function SocialMessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
