"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Flag, Loader2, LogOut, Volume2, X } from "lucide-react";
import type { Room } from "livekit-client";
import { authFetch } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import CommentairesLive from "../../../components/social/CommentairesLive";
import { RAISONS_INDISPONIBLE, dureeDepuis, useConfigLives, type Live } from "../../../lib/lives";

/* Regarder un direct : jeton « regarder seulement » délivré par le serveur
   (audience, blocage, exclusion contrôlés), vidéo et son de l'hôte,
   commentaires, signalement. Présence toutes les 15 s. */

const MOTIFS = [
  ["contenu_inapproprie", "Contenu inapproprié"], ["violence", "Violence ou menace"], ["harcelement", "Harcèlement"],
  ["arnaque", "Arnaque"], ["mineur_en_danger", "Mineur en danger"], ["autre", "Autre"],
];

export default function RegarderLivePage() {
  const { id } = useParams<{ id: string }>();
  const config = useConfigLives();
  const [live, setLive] = useState<Live | null>(null);
  const [fin, setFin] = useState("");
  const [etat, setEtat] = useState("Connexion au direct…");
  const [spectateurs, setSpectateurs] = useState(0);
  const [sonBloque, setSonBloque] = useState(false);
  const [signaler, setSignaler] = useState(false);
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState("");
  const [moi, setMoi] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const salle = useRef<Room | null>(null);

  const quitterSalle = useCallback(() => {
    salle.current?.disconnect().catch(() => {});
    salle.current = null;
  }, []);

  const finir = useCallback((texte: string) => {
    quitterSalle();
    setFin(texte);
  }, [quitterSalle]);

  // Rejoindre : le serveur décide (audience, exclusion, direct en cours).
  useEffect(() => {
    if (!config?.enabled || !id) return;
    let actif = true;
    (async () => {
      const r = await authFetch(`/social/lives/${id}/rejoindre`, { method: "POST" }).catch(() => null);
      const d = await r?.json().catch(() => null);
      if (!actif) return;
      if (!r?.ok) {
        setFin(d?.code === "DIRECT_TERMINE" ? "Ce direct est terminé." : d?.error || "Direct inaccessible.");
        return;
      }
      setLive(d.live);
      setMaintenant(Date.now());
      try {
        const payload = JSON.parse(atob(String(d.token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        setMoi(Number(String(payload.sub).replace(/^u/, "")) || null);
      } catch { /* identité facultative */ }
      try {
        const { Room: Salle, RoomEvent, Track, DisconnectReason } = await import("livekit-client");
        const room = new Salle({ adaptiveStream: true });
        salle.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && video.current) track.attach(video.current);
          if (track.kind === Track.Kind.Audio && audio.current) track.attach(audio.current);
          setEtat("");
        });
        room.on(RoomEvent.TrackUnsubscribed, () => setEtat("L'hôte a coupé sa caméra ou son micro."));
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => setSonBloque(!room.canPlaybackAudio));
        room.on(RoomEvent.Reconnecting, () => setEtat("Connexion instable : reconnexion…"));
        room.on(RoomEvent.Reconnected, () => setEtat(""));
        room.on(RoomEvent.Disconnected, (raison) => {
          if (raison === DisconnectReason.PARTICIPANT_REMOVED) finir("Vous avez été exclu de ce direct.");
          else if (raison === DisconnectReason.ROOM_DELETED) finir("Le direct est terminé.");
        });
        await room.connect(d.url, d.token);
        if (!actif) { room.disconnect(); return; }
        setSonBloque(!room.canPlaybackAudio);
        if (room.remoteParticipants.size === 0) setEtat("En attente de l'image de l'hôte…");
      } catch {
        if (actif) setEtat("Impossible de se connecter au serveur vidéo.");
      }
    })();
    return () => { actif = false; };
  }, [config?.enabled, id, finir]);

  // Présence + état (fin, exclusion) ; événements temps réel en plus.
  useEffect(() => {
    if (!live || fin) return;
    const battre = async () => {
      const r = await authFetch(`/social/lives/${live.id}/presence`, { method: "POST" }).catch(() => null);
      const d = await r?.json().catch(() => null);
      if (d?.exclu) finir("Vous avez été exclu de ce direct.");
      else if (d?.status === "ended") finir("Le direct est terminé.");
      else if (d?.compteur) setSpectateurs(d.compteur.spectateurs);
    };
    queueMicrotask(battre);
    const t = setInterval(battre, 15000);
    const h = setInterval(() => setMaintenant(Date.now()), 1000);
    const socket = getSocket();
    const termine = (p: { live_id: string }) => { if (p.live_id === live.id) finir("Le direct est terminé."); };
    const exclu = (p: { live_id: string }) => { if (p.live_id === live.id) finir("Vous avez été exclu de ce direct."); };
    socket?.on("live:termine", termine);
    socket?.on("live:exclu", exclu);
    return () => { clearInterval(t); clearInterval(h); socket?.off("live:termine", termine); socket?.off("live:exclu", exclu); };
  }, [live, fin, finir]);

  useEffect(() => () => {
    salle.current?.disconnect().catch(() => {});
  }, []);

  const quitter = async () => {
    if (live) await authFetch(`/social/lives/${live.id}/presence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ depart: true }) }).catch(() => null);
    quitterSalle();
  };

  const envoyerSignalement = async () => {
    if (!live || !motif) return;
    const r = await authFetch(`/social/lives/${live.id}/signaler`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raison: motif }) }).catch(() => null);
    setSignaler(false);
    setMessage(r?.ok ? "Signalement transmis à la modération." : "Signalement non envoyé.");
  };

  if (!config) return <main className="flex min-h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white/60" /></main>;
  if (!config.enabled || fin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-lg font-black text-gray-900">{fin || "Les directs sont indisponibles pour le moment."}</p>
          {!fin && <p className="mt-1 text-sm text-gray-500">{RAISONS_INDISPONIBLE[config.raison] || "Le service vidéo n'est pas disponible."}</p>}
          <Link href="/social/lives" className="mt-4 inline-block font-bold text-blue-700">← Directs</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-black text-white lg:flex-row">
      <div className="relative flex-1">
        <video ref={video} autoPlay playsInline className="h-[56vh] w-full bg-black object-contain lg:h-screen" />
        <audio ref={audio} autoPlay />
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
          <Link href="/social/lives" onClick={quitter} className="rounded-full bg-black/50 p-2" aria-label="Quitter"><X size={20} /></Link>
          {live && (
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-black">● {dureeDepuis(live.started_at, maintenant || Date.parse(live.started_at))}</span>
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-sm font-bold"><Eye size={15} aria-hidden="true" /> {spectateurs}</span>
            </span>
          )}
        </div>
        {etat && <p className="absolute inset-x-3 top-14 rounded-xl bg-black/70 p-2 text-center text-sm font-semibold">{etat}</p>}
        {sonBloque && (
          <button type="button" onClick={() => salle.current?.startAudio().then(() => setSonBloque(false)).catch(() => {})}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 font-black text-black">
            <Volume2 size={18} /> Activer le son
          </button>
        )}
      </div>
      <section className="flex h-[44vh] w-full flex-col bg-[#0f1b3d] lg:h-screen lg:w-96" aria-label="Direct">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
          <div className="min-w-0">
            <p className="truncate font-black">{live?.title || "Direct"}</p>
            <p className="truncate text-xs text-white/60">{live?.host.display_name}</p>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={() => setSignaler(true)} aria-label="Signaler" className="rounded-full bg-white/10 p-2"><Flag size={16} /></button>
            <Link href="/social/lives" onClick={quitter} aria-label="Quitter le direct" className="rounded-full bg-white/10 p-2"><LogOut size={16} /></Link>
          </div>
        </div>
        {message && <p className="bg-emerald-600/30 p-2 text-center text-xs font-semibold">{message}</p>}
        {signaler && (
          <div className="space-y-2 border-b border-white/10 p-3">
            <p className="text-sm font-black">Signaler ce direct</p>
            <select value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full rounded-xl bg-white/10 p-2 text-sm text-white" aria-label="Motif">
              <option value="" className="text-black">Choisir un motif…</option>
              {MOTIFS.map(([v, l]) => <option key={v} value={v} className="text-black">{l}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSignaler(false)} className="flex-1 rounded-xl bg-white/10 py-2 text-sm font-bold">Annuler</button>
              <button type="button" onClick={envoyerSignalement} disabled={!motif} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-black disabled:opacity-50">Envoyer</button>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1">
          {live && <CommentairesLive liveId={live.id} moderateur={false} peutEcrire={live.comments_enabled} moi={moi} />}
        </div>
      </section>
    </main>
  );
}
