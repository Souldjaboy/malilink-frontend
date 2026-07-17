"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { authFetch, getAuthToken } from "../lib/api";
import SocialNav from "../components/SocialNav";

type Post = {
  id: number;
  user_id: number;
  content: string;
  media: { type: string; url: string }[];
  audience: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  display_name: string;
  author_photo: string;
  verified_level: string;
  created_at: string;
};

function timeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

export default function SocialHomePage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("public");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");

  const loadFeed = () => {
    authFetch("/social/feed", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => setPosts(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  };

  useEffect(() => {
    if (!getAuthToken()) {
      setLoggedOut(true);
      setLoading(false);
      return;
    }
    authFetch("/social/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setMe(data);
        if (data?.activated) loadFeed();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const publish = async () => {
    if (!content.trim() || publishing) return;
    setPublishing(true);
    setMessage("");
    try {
      const response = await authFetch("/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, audience }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || "Erreur publication.");
      } else {
        setContent("");
        loadFeed();
      }
    } catch {
      setMessage("Erreur réseau.");
    }
    setPublishing(false);
  };

  const toggleLike = async (post: Post) => {
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              liked_by_me: !post.liked_by_me,
              likes_count: post.likes_count + (post.liked_by_me ? -1 : 1),
            }
          : item
      )
    );
    await authFetch(`/social/posts/${post.id}/like`, {
      method: post.liked_by_me ? "DELETE" : "POST",
    }).catch(() => {});
  };

  const toggleSave = async (post: Post) => {
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, saved_by_me: !post.saved_by_me } : item
      )
    );
    await authFetch(`/social/posts/${post.id}/save`, {
      method: post.saved_by_me ? "DELETE" : "POST",
    }).catch(() => {});
  };

  const showComments = async (postId: number) => {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    setComments([]);
    const response = await authFetch(`/social/posts/${postId}/comments`).catch(() => null);
    if (response?.ok) setComments(await response.json());
  };

  const sendComment = async (postId: number) => {
    if (!commentText.trim()) return;
    const response = await authFetch(`/social/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText }),
    }).catch(() => null);
    if (response?.ok) {
      setCommentText("");
      showComments(postId);
      setOpenComments(postId);
      const refreshed = await authFetch(`/social/posts/${postId}/comments`);
      if (refreshed.ok) setComments(await refreshed.json());
      setPosts((current) =>
        current.map((item) =>
          item.id === postId ? { ...item, comments_count: item.comments_count + 1 } : item
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement...</p>
        ) : loggedOut ? (
          <div className="mt-8 rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-8 text-center text-white shadow">
            <Sparkles className="mx-auto text-[var(--ml-gold,#d4a23c)]" size={36} />
            <h1 className="mt-3 text-2xl font-black text-white">Bienvenue sur MaliLink Social</h1>
            <p className="mt-2 text-white/80">
              Rencontres, échanges et réseau professionnel — la communauté MaliLink.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/client/register" className="rounded-xl bg-yellow-500 px-6 py-3.5 font-black text-black">
                Créer un compte MaliLink
              </Link>
              <Link href="/login" className="rounded-xl border border-white/25 px-6 py-3.5 font-bold text-white">
                J&apos;ai déjà un compte — Connexion
              </Link>
            </div>
          </div>
        ) : !me?.activated ? (
          <div className="mt-8 rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-8 text-center text-white shadow">
            <Sparkles className="mx-auto text-[var(--ml-gold,#d4a23c)]" size={36} />
            <h1 className="mt-3 text-2xl font-black text-white">Activez votre profil social</h1>
            <p className="mt-2 text-white/80">
              Vous avez déjà un compte MaliLink : il suffit d&apos;activer votre espace social.
              Pas de nouveau compte à créer.
            </p>
            <Link
              href="/social/profile/setup"
              className="mt-5 inline-block rounded-xl bg-yellow-500 px-8 py-3.5 font-black text-black"
            >
              Activer mon profil social
            </Link>
          </div>
        ) : (
          <>
            {/* Composer */}
            <div className="rounded-2xl bg-white p-4 shadow" id="publier">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={`Quoi de neuf, ${me.profile?.display_name?.split(" ")[0] || ""} ?`}
                className="w-full resize-none rounded-xl border border-gray-200 p-3 text-black"
                rows={3}
                maxLength={5000}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <select
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  className="rounded-xl border border-gray-200 p-2 text-sm font-semibold text-black"
                >
                  <option value="public">🌍 Public</option>
                  <option value="friends">👥 Amis</option>
                  <option value="followers">⭐ Abonnés</option>
                  <option value="me">🔒 Moi uniquement</option>
                </select>
                <button
                  onClick={publish}
                  disabled={publishing || !content.trim()}
                  className="flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-2.5 font-black text-black disabled:opacity-50"
                >
                  <Send size={16} /> Publier
                </button>
              </div>
              {message && <p className="mt-2 text-sm font-bold text-red-600">{message}</p>}
            </div>

            {/* Fil */}
            {posts.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow">
                <p className="font-bold text-gray-700">Votre fil est encore calme.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Découvrez de nouvelles personnes pour remplir votre fil.
                </p>
                <Link
                  href="/social/decouvrir"
                  className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black"
                >
                  Découvrir des personnes
                </Link>
              </div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="mt-4 rounded-2xl bg-white p-4 shadow">
                  <Link href={`/social/profile/${post.user_id}`} className="flex items-center gap-3">
                    {post.author_photo ? (
                      <img src={post.author_photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] font-black text-white">
                        {(post.display_name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="flex items-center gap-1.5 font-black text-black">
                        {post.display_name}
                        {post.verified_level !== "none" && (
                          <ShieldCheck size={15} className="text-[var(--ml-gold,#d4a23c)]" />
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                    </div>
                  </Link>
                  {post.content && (
                    <p className="mt-3 whitespace-pre-wrap text-[15px] text-black">{post.content}</p>
                  )}
                  {Array.isArray(post.media) &&
                    post.media
                      .filter((item) => item.type === "image")
                      .map((item) => (
                        <img key={item.url} src={item.url} alt="" className="mt-3 w-full rounded-xl object-cover" />
                      ))}
                  <div className="mt-3 flex items-center gap-5 border-t border-gray-100 pt-3 text-sm font-bold text-gray-500">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1.5 ${post.liked_by_me ? "text-red-600" : ""}`}
                    >
                      <Heart size={18} fill={post.liked_by_me ? "currentColor" : "none"} />
                      {post.likes_count}
                    </button>
                    <button onClick={() => showComments(post.id)} className="flex items-center gap-1.5">
                      <MessageCircle size={18} /> {post.comments_count}
                    </button>
                    <button
                      onClick={() => toggleSave(post)}
                      className={`ml-auto ${post.saved_by_me ? "text-[var(--ml-gold,#d4a23c)]" : ""}`}
                      aria-label="Enregistrer"
                    >
                      <Bookmark size={18} fill={post.saved_by_me ? "currentColor" : "none"} />
                    </button>
                  </div>
                  {openComments === post.id && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl bg-gray-50 p-2.5">
                          <p className="text-xs font-black text-black">{comment.display_name}</p>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && sendComment(post.id)}
                          placeholder="Écrire un commentaire..."
                          className="min-w-0 flex-1 rounded-xl border border-gray-200 p-2.5 text-sm text-black"
                          maxLength={2000}
                        />
                        <button
                          onClick={() => sendComment(post.id)}
                          className="rounded-xl bg-yellow-500 px-3 font-black text-black"
                          aria-label="Envoyer le commentaire"
                        >
                          <Send size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}
