"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import type { Room } from "livekit-client";
import { authFetch } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { dureeAppel, useConfigAppels, type Appel, type DemandeAppel } from "../../lib/appels";

/**
 * Appels audio/vidéo MaliLink Social. Monté une fois dans la navigation :
 * sonnerie d'un appel entrant (temps réel + sondage de secours), écran
 * d'appel, micro et caméra, raccrocher. Ne fait RIEN tant que le serveur
 * n'annonce pas les appels (LiveKit non configuré) : aucune requête de
 * sondage, aucun bouton, aucune bibliothèque chargée.
 */

type Etape = "repos" | "sortant" | "entrant" | "connexion" | "connecte" | "fin";
type Session = { id: string; kind: "audio" | "video"; nom: string; photo: string | null };

const MESSAGES_FIN: Partial<Record<Appel["status"], string>> = {
  refused: "Appel refusé", cancelled: "Appel annulé", missed: "Pas de réponse", ended: "Appel terminé", failed: "Appel interrompu",
};

/* Tonalités générées (aucun fichier son) : retour d'appel ou sonnerie. */
function demarrerTonalite(type: "sortant" | "entrant") {
  let ctx: AudioContext | null = null;
  try { ctx = new AudioContext(); } catch { /* audio indisponible */ }
  const bip = () => {
    if (!ctx) return;
    ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const freqs = type === "entrant" ? [660, 880] : [440, 480];
    for (const f of freqs) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(type === "entrant" ? 0.12 : 0.05, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (type === "entrant" ? 0.9 : 1.2));
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.3);
    }
    if (type === "entrant") navigator.vibrate?.([400, 200, 400]);
  };
  bip();
  const minuterie = setInterval(bip, type === "entrant" ? 2000 : 3000);
  return { stop: () => { clearInterval(minuterie); navigator.vibrate?.(0); ctx?.close().catch(() => {}); } };
}

function Avatar({ nom, photo, taille }: { nom: string; photo: string | null; taille: string }) {
  return photo
    ? <img src={photo} alt="" className={`${taille} rounded-full object-cover ring-4 ring-white/20`} />
    : <span className={`${taille} flex items-center justify-center rounded-full bg-amber-500 text-3xl font-black text-black ring-4 ring-white/20`}>{(nom || "?").charAt(0).toUpperCase()}</span>;
}

export default function GestionAppels() {
  const config = useConfigAppels();
  const [etape, setEtape] = useState<Etape>("repos");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [micro, setMicro] = useState(true);
  const [camera, setCamera] = useState(true);
  const [debut, setDebut] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const salle = useRef<Room | null>(null);
  const tonalite = useRef<{ stop: () => void } | null>(null);
  const videoDistante = useRef<HTMLVideoElement>(null);
  const videoLocale = useRef<HTMLVideoElement>(null);
  const audioDistant = useRef<HTMLAudioElement>(null);
  const etapeRef = useRef<Etape>("repos");
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => { etapeRef.current = etape; }, [etape]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const arreterTonalite = () => { tonalite.current?.stop(); tonalite.current = null; };

  const quitterSalle = useCallback(() => {
    const s = salle.current;
    salle.current = null;
    s?.disconnect().catch(() => {});
  }, []);

  const terminer = useCallback((texte: string) => {
    arreterTonalite();
    quitterSalle();
    setMessage(texte);
    setEtape("fin");
    setDebut(null);
    setTimeout(() => {
      if (etapeRef.current === "fin") { setEtape("repos"); setSession(null); setMessage(""); }
    }, 2500);
  }, [quitterSalle]);

  /* Connexion à la salle LiveKit (bibliothèque chargée à la demande). */
  const connecter = useCallback(async (url: string, jeton: string, kind: "audio" | "video") => {
    const { Room: Salle, RoomEvent, Track } = await import("livekit-client");
    const room = new Salle({ adaptiveStream: true, dynacast: true });
    salle.current = room;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Video && videoDistante.current) track.attach(videoDistante.current);
      if (track.kind === Track.Kind.Audio && audioDistant.current) track.attach(audioDistant.current);
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      const s = sessionRef.current;
      if (s) authFetch(`/social/calls/${s.id}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raison: "depart" }) }).catch(() => {});
      terminer("Appel terminé");
    });
    room.on(RoomEvent.Disconnected, () => {
      if (["connecte", "sortant", "connexion"].includes(etapeRef.current) && salle.current === room) terminer("Connexion perdue");
    });
    await room.connect(url, jeton);
    await room.localParticipant.setMicrophoneEnabled(true);
    if (kind === "video") {
      await room.localParticipant.setCameraEnabled(true);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track && videoLocale.current) pub.track.attach(videoLocale.current);
    }
  }, [terminer]);

  const echecMedia = useCallback((e: unknown, id: string) => {
    const nom = (e as { name?: string })?.name || "";
    authFetch(`/social/calls/${id}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raison: "media" }) }).catch(() => {});
    terminer(nom === "NotAllowedError" ? "Autorisez le micro (et la caméra) pour appeler." : "Connexion à l'appel impossible.");
  }, [terminer]);

  /* Appel sortant. */
  const appeler = useCallback(async (d: DemandeAppel) => {
    if (etapeRef.current !== "repos") return;
    setMicro(true);
    setCamera(d.kind === "video");
    setSession({ id: "", kind: d.kind, nom: d.nom, photo: d.photo || null });
    setEtape("sortant");
    const r = await authFetch("/social/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: d.userId, kind: d.kind }) }).catch(() => null);
    const data = await r?.json().catch(() => null);
    if (!r?.ok) return terminer(data?.error || "Appel impossible.");
    const s: Session = { id: data.call.id, kind: d.kind, nom: d.nom, photo: d.photo || null };
    setSession(s);
    sessionRef.current = s;
    tonalite.current = demarrerTonalite("sortant");
    connecter(data.url, data.token, d.kind).catch((e) => echecMedia(e, s.id));
  }, [connecter, echecMedia, terminer]);

  const surEntrant = useCallback((a: Appel) => {
    if (etapeRef.current !== "repos" || a.status !== "ringing") return;
    setMicro(true);
    setCamera(a.kind === "video");
    setSession({ id: a.id, kind: a.kind, nom: a.other?.display_name || "Membre MaliLink", photo: a.other?.avatar_url || null });
    setEtape("entrant");
    tonalite.current = demarrerTonalite("entrant");
  }, []);

  const surMiseAJour = useCallback((a: Appel) => {
    const s = sessionRef.current;
    if (!s || a.id !== s.id) return;
    if (a.status === "accepted" && etapeRef.current === "sortant") {
      arreterTonalite();
      setDebut(Date.now());
      setEtape("connecte");
    } else if (MESSAGES_FIN[a.status] && etapeRef.current !== "fin") {
      terminer(MESSAGES_FIN[a.status] || "Appel terminé");
    }
  }, [terminer]);

  const accepter = async () => {
    const s = sessionRef.current;
    if (!s) return;
    arreterTonalite();
    setEtape("connexion");
    const r = await authFetch(`/social/calls/${s.id}/accept`, { method: "POST" }).catch(() => null);
    const data = await r?.json().catch(() => null);
    if (!r?.ok) return terminer(data?.error || "Cet appel n'est plus disponible.");
    try {
      await connecter(data.url, data.token, s.kind);
      setDebut(Date.now());
      setEtape("connecte");
    } catch (e) { echecMedia(e, s.id); }
  };

  const refuser = async () => {
    const s = sessionRef.current;
    if (s) await authFetch(`/social/calls/${s.id}/refuse`, { method: "POST" }).catch(() => null);
    terminer("Appel refusé");
  };

  const raccrocher = async () => {
    const s = sessionRef.current;
    const sonne = etapeRef.current === "sortant";
    if (s?.id) await authFetch(`/social/calls/${s.id}/${sonne ? "cancel" : "end"}`, { method: "POST" }).catch(() => null);
    terminer(sonne ? "Appel annulé" : "Appel terminé");
  };

  const basculerMicro = async () => {
    const v = !micro;
    setMicro(v);
    await salle.current?.localParticipant.setMicrophoneEnabled(v).catch(() => {});
  };
  const basculerCamera = async () => {
    const v = !camera;
    setCamera(v);
    await salle.current?.localParticipant.setCameraEnabled(v).catch(() => {});
  };

  // Demandes d'appel venues des autres écrans (messagerie, profil).
  useEffect(() => {
    if (!config.enabled) return;
    const ecouter = (e: Event) => appeler((e as CustomEvent<DemandeAppel>).detail);
    window.addEventListener("malilink:appeler", ecouter);
    return () => window.removeEventListener("malilink:appeler", ecouter);
  }, [config.enabled, appeler]);

  // Temps réel + sondage de secours (toutes les 5 s, onglet visible).
  useEffect(() => {
    if (!config.enabled) return;
    const socket = getSocket();
    const entrant = (p: { call: Appel }) => surEntrant(p.call);
    const maj = (p: { call: Appel }) => surMiseAJour(p.call);
    socket?.on("call:incoming", entrant);
    socket?.on("call:update", maj);
    const sonder = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await authFetch("/social/calls/active", { cache: "no-store" }).catch(() => null);
      if (!r?.ok) return;
      const { entrant: e, en_cours: c } = await r.json();
      if (e) surEntrant(e);
      const s = sessionRef.current;
      if (s?.id && ["sortant", "entrant", "connecte"].includes(etapeRef.current)) {
        const courant = [e, c].find((x: Appel | null) => x?.id === s.id) as Appel | undefined;
        if (courant) surMiseAJour(courant);
        else terminer("Appel terminé");
      }
    };
    const minuterie = setInterval(sonder, 5000);
    queueMicrotask(sonder);
    return () => {
      clearInterval(minuterie);
      socket?.off("call:incoming", entrant);
      socket?.off("call:update", maj);
    };
  }, [config.enabled, surEntrant, surMiseAJour, terminer]);

  // Chronomètre de l'appel.
  useEffect(() => {
    if (etape !== "connecte" || !debut) return;
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, [etape, debut]);

  // Fermeture de la page : on raccroche proprement.
  useEffect(() => () => { arreterTonalite(); quitterSalle(); }, [quitterSalle]);

  if (!config.enabled || etape === "repos" || !session) return null;

  if (etape === "entrant") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[9500] p-3 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:bg-black/50" role="alertdialog" aria-label="Appel entrant">
        <div className="mx-auto w-full max-w-sm rounded-3xl bg-[#0f1b3d] p-5 text-center text-white shadow-2xl">
          <div className="flex justify-center"><Avatar nom={session.nom} photo={session.photo} taille="h-20 w-20" /></div>
          <p className="mt-3 text-sm font-semibold text-white/70">{session.kind === "video" ? "Appel vidéo entrant" : "Appel audio entrant"}</p>
          <p className="text-xl font-black text-white">{session.nom}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={refuser} className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-black text-white">
              <PhoneOff size={20} aria-hidden="true" /> Refuser
            </button>
            <button type="button" onClick={accepter} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-black text-white">
              {session.kind === "video" ? <Video size={20} aria-hidden="true" /> : <Phone size={20} aria-hidden="true" />} Accepter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const video = session.kind === "video";
  const statut = etape === "sortant" ? "Ça sonne…" : etape === "connexion" ? "Connexion…" : etape === "fin" ? message
    : debut ? dureeAppel(Math.max(0, (maintenant || debut) - debut) / 1000) : "En communication";

  return (
    <div className="fixed inset-0 z-[9500] flex flex-col bg-[#0b1430] text-white" role="dialog" aria-modal="true" aria-label="Appel en cours">
      <audio ref={audioDistant} autoPlay />
      {video && <video ref={videoDistante} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />}
      {video && etape !== "fin" && (
        <video ref={videoLocale} autoPlay playsInline muted className={`absolute right-3 top-3 z-10 h-36 w-24 rounded-2xl bg-black object-cover shadow-lg ring-2 ring-white/30 -scale-x-100 sm:h-48 sm:w-36 ${camera ? "" : "opacity-0"}`} />
      )}
      <div className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center ${video && etape === "connecte" ? "justify-end pb-6" : ""}`}>
        {!(video && etape === "connecte") && <Avatar nom={session.nom} photo={session.photo} taille="h-28 w-28" />}
        <p className="text-2xl font-black text-white drop-shadow">{session.nom}</p>
        <p className={`font-semibold drop-shadow ${etape === "fin" ? "text-amber-300" : "text-white/80"}`} aria-live="polite">{statut}</p>
      </div>
      {etape !== "fin" && (
        <div className="relative z-10 flex items-center justify-center gap-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
          <button type="button" onClick={basculerMicro} aria-pressed={!micro} aria-label={micro ? "Couper le micro" : "Activer le micro"}
            className={`flex h-14 w-14 items-center justify-center rounded-full ${micro ? "bg-white/15" : "bg-white text-black"}`}>
            {micro ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          {video && (
            <button type="button" onClick={basculerCamera} aria-pressed={!camera} aria-label={camera ? "Couper la caméra" : "Activer la caméra"}
              className={`flex h-14 w-14 items-center justify-center rounded-full ${camera ? "bg-white/15" : "bg-white text-black"}`}>
              {camera ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}
          <button type="button" onClick={raccrocher} aria-label="Raccrocher" className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <PhoneOff size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
