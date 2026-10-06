"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Circle, RefreshCw, Square, Video, X } from "lucide-react";
import { duree, formatEnregistrement, messageCamera } from "../../lib/social";

/**
 * Prise de photo ou enregistrement vidéo depuis la caméra (téléphone ou
 * webcam). La vidéo s'arrête d'elle-même à la durée maximale ; rien n'est
 * envoyé ici : le résultat est rendu au composeur, qui l'affiche en aperçu.
 */
export default function CameraCapture({
  mode: modeInitial, dureeMax, onResult, onClose,
}: {
  mode: "photo" | "video";
  dureeMax: number;
  onResult: (fichier: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const [mode, setMode] = useState(modeInitial);
  const [face, setFace] = useState<"user" | "environment">("environment");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [ecoule, setEcoule] = useState(0);

  useEffect(() => {
    let annule = false;
    (async () => {
      setErreur("");
      flux.current?.getTracks().forEach((t) => t.stop());
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: "NotFoundError" });
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: mode === "video",
        });
        if (annule) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        flux.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
      } catch (e) {
        if (!annule) setErreur(messageCamera(e));
      }
    })();
    return () => {
      annule = true;
    };
  }, [face, mode]);

  useEffect(() => () => flux.current?.getTracks().forEach((t) => t.stop()), []);

  useEffect(() => {
    if (!enCours) return;
    const debut = Date.now();
    const minuterie = setInterval(() => {
      const s = (Date.now() - debut) / 1000;
      setEcoule(s);
      if (s >= dureeMax) enregistreur.current?.stop();
    }, 250);
    return () => clearInterval(minuterie);
  }, [enCours, dureeMax]);

  const fermer = () => {
    if (enregistreur.current?.state === "recording") {
      enregistreur.current.onstop = null;
      enregistreur.current.stop();
    }
    flux.current?.getTracks().forEach((t) => t.stop());
    onClose();
  };

  const photographier = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const toile = document.createElement("canvas");
    toile.width = v.videoWidth;
    toile.height = v.videoHeight;
    toile.getContext("2d")?.drawImage(v, 0, 0);
    toile.toBlob((blob) => {
      if (!blob) return;
      flux.current?.getTracks().forEach((t) => t.stop());
      onResult(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  const demarrer = () => {
    const type = formatEnregistrement();
    if (!flux.current || !type) {
      setErreur("Ce navigateur ne sait pas enregistrer de vidéo : choisissez un fichier vidéo.");
      return;
    }
    morceaux.current = [];
    const r = new MediaRecorder(flux.current, { mimeType: type, videoBitsPerSecond: 1_500_000 });
    r.ondataavailable = (e) => { if (e.data.size > 0) morceaux.current.push(e.data); };
    r.onstop = () => {
      setEnCours(false);
      const base = type.split(";")[0];
      const blob = new Blob(morceaux.current, { type: base });
      flux.current?.getTracks().forEach((t) => t.stop());
      onResult(new File([blob], `video-${Date.now()}.${base === "video/mp4" ? "mp4" : "webm"}`, { type: base }));
    };
    enregistreur.current = r;
    r.start(1000);
    setEcoule(0);
    setEnCours(true);
  };

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Caméra">
      <div className="flex items-center justify-between p-3 text-white">
        <button type="button" onClick={fermer} className="rounded-full bg-white/10 p-2" aria-label="Fermer la caméra">
          <X size={22} />
        </button>
        {!enCours && (
          <div className="flex rounded-full bg-white/10 p-1 text-sm font-bold">
            <button type="button" onClick={() => setMode("photo")} aria-pressed={mode === "photo"}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${mode === "photo" ? "bg-yellow-500 text-black" : ""}`}>
              <Camera size={16} /> Photo
            </button>
            <button type="button" onClick={() => setMode("video")} aria-pressed={mode === "video"}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${mode === "video" ? "bg-yellow-500 text-black" : ""}`}>
              <Video size={16} /> Vidéo
            </button>
          </div>
        )}
        <button type="button" onClick={() => setFace(face === "user" ? "environment" : "user")} disabled={enCours}
          className="rounded-full bg-white/10 p-2 disabled:opacity-40" aria-label="Changer de caméra">
          <RefreshCw size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {erreur ? (
          <p role="alert" className="mx-6 rounded-xl bg-red-50 p-4 text-center font-bold text-red-800">{erreur}</p>
        ) : (
          <video ref={video} muted playsInline className={`max-h-full max-w-full ${face === "user" ? "-scale-x-100" : ""}`} />
        )}
        {enCours && (
          <span className="absolute top-3 rounded-full bg-red-600 px-3 py-1 text-sm font-black text-white">
            ● {duree(ecoule)} / {duree(dureeMax)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center p-6">
        {mode === "photo" ? (
          <button type="button" onClick={photographier} disabled={Boolean(erreur)}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white p-1 disabled:opacity-40" aria-label="Prendre la photo">
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        ) : enCours ? (
          <button type="button" onClick={() => enregistreur.current?.stop()}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white p-4" aria-label="Arrêter l'enregistrement">
            <Square size={28} fill="#dc2626" className="text-red-600" />
          </button>
        ) : (
          <button type="button" onClick={demarrer} disabled={Boolean(erreur)}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white p-2 disabled:opacity-40" aria-label="Démarrer l'enregistrement">
            <Circle size={44} fill="#dc2626" className="text-red-600" />
          </button>
        )}
      </div>
    </div>
  );
}
