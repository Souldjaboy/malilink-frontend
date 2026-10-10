"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Loader2, Mic, MicOff, Radio, UserX, Users, Video, VideoOff, X } from "lucide-react";
import type { Room } from "livekit-client";
import { authFetch } from "../../../lib/api";
import CommentairesLive from "../../../components/social/CommentairesLive";
import { AUDIENCES_LIVE, RAISONS_INDISPONIBLE, dureeDepuis, useConfigLives, type Live } from "../../../lib/lives";

/* Lancer un direct : aperçu caméra/micro, puis publication via LiveKit.
   Présence envoyée toutes les 15 s (sans elle, le direct se ferme seul
   au bout d'une minute). Aucun enregistrement. */

type Spectateur = { user_id: number; display_name: string; photo_url: string | null; present: boolean; banned_at: string | null };

function messageMedia(e: unknown) {
  const n = (e as { name?: string })?.name;
  if (n === "NotAllowedError") return "Autorisez la caméra et le micro dans votre navigateur pour lancer un direct.";
  if (n === "NotFoundError") return "Aucune caméra ou aucun micro détecté.";
  if (n === "NotReadableError") return "La caméra est déjà utilisée par une autre application.";
  return "Caméra ou micro indisponible.";
}

export default function NouveauLivePage() {
  const router = useRouter();
  const config = useConfigLives();
  const [titre, setTitre] = useState("");
  const [audience, setAudience] = useState("public");
  const [apercu, setApercu] = useState<MediaStream | null>(null);
  const [erreur, setErreur] = useState("");
  const [live, setLive] = useState<Live | null>(null);
  const [spectateurs, setSpectateurs] = useState(0);
  const [etatConnexion, setEtatConnexion] = useState("");
  const [micro, setMicro] = useState(true);
  const [camera, setCamera] = useState(true);
  const [liste, setListe] = useState<Spectateur[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [maintenant, setMaintenant] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const salle = useRef<Room | null>(null);

  // Aperçu caméra + micro avant de démarrer.
  const ouvrirApercu = useCallback(async () => {
    setErreur("");
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      setApercu(flux);
    } catch (e) {
      setErreur(messageMedia(e));
    }
  }, []);
  useEffect(() => {
    if (video.current && apercu && !live) video.current.srcObject = apercu;
  }, [apercu, live]);
  useEffect(() => () => { apercu?.getTracks().forEach((t) => t.stop()); }, [apercu]);

  const terminer = useCallback(async (id?: string) => {
    const cible = id || live?.id;
    if (cible) await authFetch(`/social/lives/${cible}/terminer`, { method: "POST" }).catch(() => null);
    salle.current?.disconnect().catch(() => {});
    salle.current = null;
  }, [live?.id]);

  const demarrer = async () => {
    if (titre.trim().length < 3) return setErreur("Donnez un titre (3 caractères au moins).");
    setEnvoi(true);
    setErreur("");
    const r = await authFetch("/social/lives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: titre, audience }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { setEnvoi(false); return setErreur(d?.error || "Impossible de lancer le direct."); }
    try {
      const { Room: Salle, RoomEvent, Track } = await import("livekit-client");
      const room = new Salle({ adaptiveStream: true, dynacast: true });
      salle.current = room;
      room.on(RoomEvent.Reconnecting, () => setEtatConnexion("Connexion instable : reconnexion…"));
      room.on(RoomEvent.Reconnected, () => setEtatConnexion(""));
      room.on(RoomEvent.Disconnected, () => setEtatConnexion("Déconnecté du serveur vidéo."));
      await room.connect(d.url, d.token);
      apercu?.getTracks().forEach((t) => t.stop());
      setApercu(null);
      await room.localParticipant.enableCameraAndMicrophone();
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track && video.current) pub.track.attach(video.current);
      setLive(d.live);
      setMaintenant(Date.now());
    } catch (e) {
      await terminer(d.live.id);
      setErreur(`Direct annulé : ${messageMedia(e)}`);
    } finally {
      setEnvoi(false);
    }
  };

  // Présence de l'hôte + compteur réel.
  useEffect(() => {
    if (!live) return;
    const battre = async () => {
      const r = await authFetch(`/social/lives/${live.id}/presence`, { method: "POST" }).catch(() => null);
      const d = await r?.json().catch(() => null);
      if (d?.compteur) setSpectateurs(d.compteur.spectateurs);
      if (d?.status === "ended") { salle.current?.disconnect().catch(() => {}); setEtatConnexion("Direct terminé."); }
    };
    queueMicrotask(battre);
    const t = setInterval(battre, 15000);
    const h = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(h); };
  }, [live]);

  // Quitter la page termine le direct.
  useEffect(() => () => { salle.current?.disconnect().catch(() => {}); }, []);

  const chargerSpectateurs = async () => {
    if (!live) return;
    const r = await authFetch(`/social/lives/${live.id}/spectateurs`, { cache: "no-store" }).catch(() => null);
    setListe(r?.ok ? await r.json() : []);
  };
  const exclure = async (uid: number) => {
    if (!live || !window.confirm("Exclure cette personne du direct ?")) return;
    await authFetch(`/social/lives/${live.id}/exclure/${uid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    chargerSpectateurs();
  };

  if (!config) return <main className="flex min-h-screen items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-gray-400" /></main>;
  if (!config.enabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <p className="text-lg font-black text-gray-900">Les directs sont indisponibles pour le moment.</p>
          <p className="mt-1 text-sm text-gray-500">{RAISONS_INDISPONIBLE[config.raison] || "Le service vidéo n'est pas disponible."}</p>
          <Link href="/social/lives" className="mt-4 inline-block font-bold text-blue-700">← Directs</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-black text-white lg:flex-row">
      <div className="relative flex-1 bg-black">
        <video ref={video} autoPlay playsInline muted className={`h-[60vh] w-full object-cover -scale-x-100 lg:h-screen ${live && !camera ? "opacity-0" : ""}`} />
        {!apercu && !live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Video size={40} className="text-white/60" aria-hidden="true" />
            <button type="button" onClick={ouvrirApercu} className="rounded-xl bg-white px-5 py-3 font-black text-black">Activer la caméra et le micro</button>
          </div>
        )}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
          {live ? (
            <span className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-black">● EN DIRECT · {dureeDepuis(live.started_at, maintenant || Date.parse(live.started_at))}</span>
          ) : (
            <Link href="/social/lives" className="rounded-full bg-black/50 p-2" aria-label="Fermer"><X size={20} /></Link>
          )}
          {live && <span className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-sm font-bold"><Eye size={15} aria-hidden="true" /> {spectateurs}</span>}
        </div>
        {etatConnexion && <p className="absolute inset-x-3 top-14 rounded-xl bg-amber-500/90 p-2 text-center text-sm font-bold text-black">{etatConnexion}</p>}
        {live && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
            <button type="button" onClick={async () => { const v = !micro; setMicro(v); await salle.current?.localParticipant.setMicrophoneEnabled(v).catch(() => {}); }}
              aria-label={micro ? "Couper le micro" : "Activer le micro"} className={`rounded-full p-3.5 ${micro ? "bg-white/20" : "bg-white text-black"}`}>{micro ? <Mic size={22} /> : <MicOff size={22} />}</button>
            <button type="button" onClick={async () => { const v = !camera; setCamera(v); await salle.current?.localParticipant.setCameraEnabled(v).catch(() => {}); }}
              aria-label={camera ? "Couper la caméra" : "Activer la caméra"} className={`rounded-full p-3.5 ${camera ? "bg-white/20" : "bg-white text-black"}`}>{camera ? <Video size={22} /> : <VideoOff size={22} />}</button>
            <button type="button" onClick={chargerSpectateurs} aria-label="Spectateurs" className="rounded-full bg-white/20 p-3.5"><Users size={22} /></button>
            <button type="button" onClick={async () => { if (window.confirm("Terminer le direct ?")) { await terminer(); router.push("/social/lives"); } }}
              className="rounded-full bg-red-600 px-5 font-black">Terminer</button>
          </div>
        )}
      </div>

      <section className="flex w-full flex-col bg-[#0f1b3d] lg:h-screen lg:w-96" aria-label="Direct">
        {!live ? (
          <div className="space-y-3 p-4">
            <h1 className="flex items-center gap-2 text-xl font-black text-white"><Radio className="text-red-500" aria-hidden="true" /> Lancer un direct</h1>
            <label className="block text-sm font-semibold text-white/80">Titre
              <input value={titre} onChange={(e) => setTitre(e.target.value.slice(0, 120))} placeholder="De quoi parle votre direct ?"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2.5 text-white placeholder:text-white/40 outline-none focus:bg-white/20" />
            </label>
            <label className="block text-sm font-semibold text-white/80">Qui peut regarder
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2.5 text-white">
                {AUDIENCES_LIVE.map((a) => <option key={a.value} value={a.value} className="text-black">{a.label}</option>)}
              </select>
            </label>
            <p className="text-xs text-white/50">Vos amis et abonnés concernés sont prévenus. Le direct n&apos;est pas enregistré.</p>
            {erreur && <p role="alert" className="rounded-xl bg-red-500/20 p-3 text-sm font-semibold text-red-200">{erreur}</p>}
            <button type="button" onClick={demarrer} disabled={envoi || !apercu}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-black text-white disabled:opacity-50">
              {envoi ? <Loader2 size={18} className="animate-spin" /> : <Radio size={18} />} {apercu ? "Démarrer le direct" : "Activez d'abord la caméra"}
            </button>
          </div>
        ) : liste ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <p className="font-black">Spectateurs</p>
              <button type="button" onClick={() => setListe(null)} className="text-sm font-bold text-amber-300">Commentaires</button>
            </div>
            <ul className="flex-1 divide-y divide-white/10 overflow-y-auto">
              {liste.length === 0 && <li className="p-4 text-sm text-white/60">Personne pour l&apos;instant.</li>}
              {liste.map((s) => (
                <li key={s.user_id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span>{s.display_name || "Membre"} {s.banned_at ? <em className="text-red-300">(exclu)</em> : s.present ? "" : <em className="text-white/40">(parti)</em>}</span>
                  {!s.banned_at && <button type="button" onClick={() => exclure(s.user_id)} className="flex items-center gap-1 rounded-lg bg-red-600/80 px-2 py-1 text-xs font-bold"><UserX size={13} /> Exclure</button>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="border-b border-white/10 p-3 font-black">{live.title}</p>
            <div className="min-h-0 flex-1"><CommentairesLive liveId={live.id} moderateur peutEcrire moi={live.host.user_id} /></div>
          </div>
        )}
      </section>
    </main>
  );
}
