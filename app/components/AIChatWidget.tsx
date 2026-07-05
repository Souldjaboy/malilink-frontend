"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { authFetch } from "../lib/api";
import { appProduct } from "../lib/product-config";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME_MESSAGE =
  "Bonjour 👋 Je suis l’assistant IA MaliLink. Posez-moi une question sur vos ventes, commandes, livraisons ou votre école.";

const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 8;

export function AIChatPanel({
  space,
  suggestions = [],
  heightClass = "h-full",
}: {
  space: string;
  suggestions?: string[];
  heightClass?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const content = String(text ?? input).trim();
    if (!content || loading) return;
    if (content.length > MAX_MESSAGE_LENGTH) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Votre message est trop long (maximum ${MAX_MESSAGE_LENGTH} caractères).`,
        },
      ]);
      return;
    }

    const history = messages.slice(-HISTORY_LIMIT);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);

    try {
      const response = await authFetch("/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, space, history }),
      });
      const data = await response.json().catch(() => ({}));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.answer ||
            data.error ||
            "L’assistant IA est temporairement indisponible. Réessayez dans quelques instants.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Connexion impossible avec l’assistant IA. Vérifiez votre réseau et réessayez.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className={`flex flex-col ${heightClass}`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-100 text-black"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
            <Bot size={16} className="animate-pulse" />
            L’assistant réfléchit...
          </div>
        )}

        {messages.length <= 1 && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-left text-xs font-semibold text-black transition hover:border-yellow-500"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-gray-200 p-3">
        <input
          type="text"
          value={input}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Écrivez votre question..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-black"
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Envoyer"
          className="flex items-center justify-center rounded-xl bg-yellow-500 px-4 font-bold text-black"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export default function AIChatWidget({
  space,
  title = "Assistant MaliLink",
  suggestions = [],
}: {
  space: string;
  title?: string;
  suggestions?: string[];
}) {
  const [open, setOpen] = useState(false);

  if (appProduct !== "malilink") return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-yellow-500 px-5 py-4 font-bold text-black shadow-2xl transition hover:scale-105"
        >
          <Bot size={22} />
          <span className="hidden sm:inline">Assistant IA</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-0 right-0 z-[60] flex h-[min(620px,100dvh)] w-full flex-col overflow-hidden bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-[min(620px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-3xl">
          <div className="flex items-center justify-between bg-[#0a1c3a] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500 text-black">
                <Bot size={20} />
              </span>
              <div>
                <p className="text-sm font-black text-white">{title}</p>
                <p className="text-xs text-yellow-400">En ligne — réponses en français</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer l’assistant"
              className="rounded-full p-2 text-white transition hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          <AIChatPanel space={space} suggestions={suggestions} heightClass="h-full min-h-0 flex-1" />
        </div>
      )}
    </>
  );
}
