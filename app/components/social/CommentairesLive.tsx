"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { authFetch } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import type { CommentaireLive } from "../../lib/lives";

/* Commentaires d'un direct : temps réel (Socket.io) + relève toutes les
   3 s. Le texte est affiché comme TEXTE (jamais interprété en HTML). */
export default function CommentairesLive({
  liveId, moderateur, peutEcrire, moi,
}: { liveId: string; moderateur: boolean; peutEcrire: boolean; moi: number | null }) {
  const [liste, setListe] = useState<CommentaireLive[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const dernier = useRef(0);
  const bas = useRef<HTMLDivElement>(null);

  const ajouter = useCallback((nouveaux: CommentaireLive[]) => {
    if (!nouveaux.length) return;
    setListe((l) => {
      const ids = new Set(l.map((c) => c.id));
      const fusion = [...l, ...nouveaux.filter((c) => !ids.has(c.id))].slice(-200);
      dernier.current = Math.max(dernier.current, ...fusion.map((c) => c.id));
      return fusion;
    });
  }, []);

  useEffect(() => {
    let actif = true;
    const relever = async () => {
      const r = await authFetch(`/social/lives/${liveId}/commentaires?apres=${dernier.current}`, { cache: "no-store" }).catch(() => null);
      if (actif && r?.ok) ajouter(await r.json());
    };
    queueMicrotask(relever);
    const t = setInterval(relever, 3000);
    const socket = getSocket();
    const recu = (p: { live_id: string; commentaire: CommentaireLive }) => { if (p.live_id === liveId) ajouter([p.commentaire]); };
    const supprime = (p: { live_id: string; commentaire_id: number }) => {
      if (p.live_id === liveId) setListe((l) => l.filter((c) => c.id !== p.commentaire_id));
    };
    socket?.on("live:commentaire", recu);
    socket?.on("live:commentaire_supprime", supprime);
    return () => {
      actif = false;
      clearInterval(t);
      socket?.off("live:commentaire", recu);
      socket?.off("live:commentaire_supprime", supprime);
    };
  }, [liveId, ajouter]);

  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [liste.length]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const contenu = texte.trim();
    if (!contenu) return;
    setErreur("");
    const r = await authFetch(`/social/lives/${liveId}/commentaires`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: contenu }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) return setErreur(d?.error || "Commentaire non envoyé.");
    setTexte("");
    ajouter([d]);
  };

  const supprimer = async (id: number) => {
    const r = await authFetch(`/social/lives/${liveId}/commentaires/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) setListe((l) => l.filter((c) => c.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {liste.length === 0 && <p className="text-center text-sm text-white/60">Aucun commentaire pour l&apos;instant.</p>}
        {liste.map((c) => (
          <div key={c.id} className="group flex items-start gap-2 text-sm">
            {c.photo_url
              ? <img src={c.photo_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-black text-white">{(c.display_name || "?").charAt(0)}</span>}
            <p className="min-w-0 flex-1 break-words text-white">
              <span className="font-bold text-amber-300">{c.display_name} </span>{c.content}
            </p>
            {(moderateur || c.user_id === moi) && (
              <button type="button" onClick={() => supprimer(c.id)} aria-label="Supprimer le commentaire" className="text-white/50 opacity-0 hover:text-red-300 group-hover:opacity-100 focus:opacity-100">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <div ref={bas} />
      </div>
      {erreur && <p className="px-3 text-xs font-semibold text-red-300">{erreur}</p>}
      {peutEcrire && (
        <form onSubmit={envoyer} className="flex gap-2 border-t border-white/10 p-2">
          <input value={texte} onChange={(e) => setTexte(e.target.value.slice(0, 300))} placeholder="Écrire un commentaire…" aria-label="Commentaire"
            className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:bg-white/20" />
          <button type="submit" disabled={!texte.trim()} aria-label="Envoyer" className="rounded-full bg-amber-500 p-2.5 text-black disabled:opacity-40"><Send size={16} /></button>
        </form>
      )}
    </div>
  );
}
