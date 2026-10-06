"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark, ChevronLeft, ChevronRight, Globe2, Heart, Lock, MessageCircle, MoreHorizontal, Play,
  Send, ShieldCheck, Star, Trash2, Users, X,
} from "lucide-react";
import { authFetch } from "../../lib/api";
import { duree, mediaUrl, tempsEcoule, type SocialMedia, type SocialPost } from "../../lib/social";

const ICONE_AUDIENCE = {
  public: { icone: Globe2, libelle: "Public" },
  friends: { icone: Users, libelle: "Amis" },
  followers: { icone: Star, libelle: "Abonnés" },
  me: { icone: Lock, libelle: "Moi uniquement" },
} as const;

/* Vidéo : rien n'est téléchargé tant qu'elle n'est pas à l'écran ; ensuite
   seules les métadonnées, et le flux par plages quand on appuie sur lecture. */
function VideoDifferee({ media }: { media: SocialMedia }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [lancee, setLancee] = useState(false);

  useEffect(() => {
    const el = conteneur.current;
    if (!el || visible) return;
    const obs = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) {
        setVisible(true);
        obs.disconnect();
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  const portrait = (media.height || 0) > (media.width || 0);
  return (
    <div ref={conteneur} className={`relative mt-3 overflow-hidden rounded-xl bg-black ${portrait ? "mx-auto max-w-sm" : ""}`}>
      {lancee ? (
        <video
          src={mediaUrl(media.src)}
          poster={mediaUrl(media.poster)}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="max-h-[70vh] w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLancee(true)}
          className="group relative block w-full"
          aria-label="Lire la vidéo"
        >
          {visible && media.poster ? (
            <img src={mediaUrl(media.poster)} alt="" loading="lazy" decoding="async" className="max-h-[70vh] w-full object-contain" />
          ) : (
            <div className="aspect-video w-full bg-gray-900" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:scale-105">
              <Play size={30} fill="currentColor" />
            </span>
          </span>
          {media.duration_seconds ? (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white">
              {duree(media.duration_seconds)}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}

function GaleriePhotos({ photos }: { photos: SocialMedia[] }) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  const visibles = photos.slice(0, 4);
  const reste = photos.length - visibles.length;
  const grille =
    photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-2";

  useEffect(() => {
    if (ouverte === null) return;
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuverte(null);
      if (e.key === "ArrowRight") setOuverte((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOuverte((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, [ouverte, photos.length]);

  return (
    <>
      <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${grille}`}>
        {visibles.map((photo, index) => (
          <button
            key={photo.id || photo.src}
            type="button"
            onClick={() => setOuverte(index)}
            className={`relative block bg-gray-100 ${photos.length === 3 && index === 0 ? "row-span-2" : ""}`}
            aria-label={`Agrandir la photo ${index + 1}`}
          >
            <img
              src={mediaUrl(photo.src)}
              alt=""
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover ${photos.length === 1 ? "max-h-[75vh]" : "aspect-square"}`}
            />
            {index === visibles.length - 1 && reste > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-black text-white">
                +{reste}
              </span>
            )}
          </button>
        ))}
      </div>
      {ouverte !== null && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setOuverte(null)} className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white" aria-label="Fermer">
            <X size={24} />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => setOuverte((ouverte - 1 + photos.length) % photos.length)}
                className="absolute left-2 rounded-full bg-white/10 p-2 text-white" aria-label="Photo précédente">
                <ChevronLeft size={28} />
              </button>
              <button type="button" onClick={() => setOuverte((ouverte + 1) % photos.length)}
                className="absolute right-2 rounded-full bg-white/10 p-2 text-white" aria-label="Photo suivante">
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <img src={mediaUrl(photos[ouverte].src)} alt="" className="max-h-[90vh] max-w-[94vw] object-contain" />
          <span className="absolute bottom-4 text-sm font-bold text-white/80">{ouverte + 1} / {photos.length}</span>
        </div>
      )}
    </>
  );
}

export default function PostCard({
  post, me, onChange, onDelete,
}: {
  post: SocialPost;
  me: number | null;
  onChange: (post: SocialPost) => void;
  onDelete?: (id: number) => void;
}) {
  const [commentairesOuverts, setCommentairesOuverts] = useState(false);
  const [commentaires, setCommentaires] = useState<any[]>([]);
  const [texte, setTexte] = useState("");
  const [menu, setMenu] = useState(false);
  const [erreur, setErreur] = useState("");

  const audience = ICONE_AUDIENCE[post.audience] || ICONE_AUDIENCE.public;
  const photos = (post.media || []).filter((m) => m.type === "image");
  const video = (post.media || []).find((m) => m.type === "video");

  const aimer = async () => {
    const aime = post.liked_by_me;
    onChange({ ...post, liked_by_me: !aime, likes_count: Math.max(0, post.likes_count + (aime ? -1 : 1)) });
    const r = await authFetch(`/social/posts/${post.id}/like`, { method: aime ? "DELETE" : "POST" }).catch(() => null);
    if (!r?.ok) onChange(post);
  };

  const enregistrer = async () => {
    onChange({ ...post, saved_by_me: !post.saved_by_me });
    const r = await authFetch(`/social/posts/${post.id}/save`, { method: post.saved_by_me ? "DELETE" : "POST" }).catch(() => null);
    if (!r?.ok) onChange(post);
  };

  const chargerCommentaires = async () => {
    const r = await authFetch(`/social/posts/${post.id}/comments`).catch(() => null);
    if (r?.ok) setCommentaires(await r.json());
  };

  const basculerCommentaires = () => {
    const ouvrir = !commentairesOuverts;
    setCommentairesOuverts(ouvrir);
    if (ouvrir) chargerCommentaires();
  };

  const commenter = async () => {
    const contenu = texte.trim();
    if (!contenu) return;
    setErreur("");
    const r = await authFetch(`/social/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contenu }),
    }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    if (!r?.ok) {
      setErreur(data?.error || "Commentaire refusé.");
      return;
    }
    setTexte("");
    onChange({ ...post, comments_count: post.comments_count + 1 });
    chargerCommentaires();
  };

  const supprimerCommentaire = async (id: number) => {
    const r = await authFetch(`/social/comments/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) {
      setCommentaires((liste) => liste.filter((c) => c.id !== id));
      onChange({ ...post, comments_count: Math.max(0, post.comments_count - 1) });
    }
  };

  const supprimer = async () => {
    setMenu(false);
    if (!window.confirm("Supprimer cette publication ?")) return;
    const r = await authFetch(`/social/posts/${post.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) onDelete?.(post.id);
    else setErreur("Suppression impossible.");
  };

  return (
    <article className="mt-4 rounded-2xl bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/social/profile/${post.user_id}`} className="flex min-w-0 items-center gap-3">
          {post.author_photo ? (
            <img src={post.author_photo} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] font-black text-white">
              {(post.display_name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-black text-black">
              {post.display_name}
              {post.verified_level && post.verified_level !== "none" && (
                <ShieldCheck size={15} className="shrink-0 text-[var(--ml-gold,#d4a23c)]" />
              )}
            </p>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              {tempsEcoule(post.created_at)} · <audience.icone size={12} aria-hidden="true" /> {audience.libelle}
            </p>
          </div>
        </Link>
        {me === post.user_id && (
          <div className="relative">
            <button type="button" onClick={() => setMenu(!menu)} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Options de la publication">
              <MoreHorizontal size={20} />
            </button>
            {menu && (
              <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                <button type="button" onClick={supprimer} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50">
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.content && <p className="mt-3 whitespace-pre-wrap break-words text-[15px] text-black">{post.content}</p>}
      {photos.length > 0 && <GaleriePhotos photos={photos} />}
      {video && <VideoDifferee media={video} />}

      <div className="mt-3 flex items-center gap-5 border-t border-gray-100 pt-3 text-sm font-bold text-gray-600">
        <button type="button" onClick={aimer} className={`flex items-center gap-1.5 ${post.liked_by_me ? "text-red-600" : ""}`}
          aria-pressed={post.liked_by_me} aria-label="J'aime">
          <Heart size={18} fill={post.liked_by_me ? "currentColor" : "none"} />
          {post.likes_count}
        </button>
        <button type="button" onClick={basculerCommentaires} className="flex items-center gap-1.5" aria-expanded={commentairesOuverts}
          aria-label="Commentaires">
          <MessageCircle size={18} /> {post.comments_count}
        </button>
        <button type="button" onClick={enregistrer} className={`ml-auto ${post.saved_by_me ? "text-[var(--ml-gold,#d4a23c)]" : ""}`}
          aria-pressed={post.saved_by_me} aria-label="Enregistrer">
          <Bookmark size={18} fill={post.saved_by_me ? "currentColor" : "none"} />
        </button>
      </div>
      {erreur && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{erreur}</p>}

      {commentairesOuverts && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {commentaires.length === 0 && <p className="text-sm text-gray-500">Aucun commentaire pour l&apos;instant.</p>}
          {commentaires.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              {c.photo_url ? (
                <img src={c.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-black">
                  {(c.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1 rounded-xl bg-gray-50 p-2.5">
                <p className="text-xs font-black text-black">{c.display_name}</p>
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{c.content}</p>
              </div>
              {me === c.user_id && (
                <button type="button" onClick={() => supprimerCommentaire(c.id)} className="p-1 text-gray-400 hover:text-red-600"
                  aria-label="Supprimer mon commentaire">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commenter()}
              placeholder="Écrire un commentaire…"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 p-2.5 text-sm text-black"
              maxLength={2000}
              aria-label="Votre commentaire"
            />
            <button type="button" onClick={commenter} className="rounded-xl bg-yellow-500 px-3 font-black text-black" aria-label="Envoyer le commentaire">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
