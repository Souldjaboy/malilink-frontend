"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Film, ImagePlus, Loader2, Send, X } from "lucide-react";
import { authFetch } from "../../lib/api";
import {
  analyserVideo, AUDIENCES, CONFIG_PAR_DEFAUT, duree, preparerPhoto, televerserMedia,
  type MediaConfig, type SocialMedia, type SocialPost,
} from "../../lib/social";
import CameraCapture from "./CameraCapture";

type Element = {
  cle: string;
  type: "image" | "video";
  apercu: string;
  etat: "envoi" | "pret" | "erreur";
  progression: number;
  media?: SocialMedia;
  erreur?: string;
  duree?: number;
  annuler?: () => void;
};

/**
 * Composeur MaliLink Social : texte seul, une ou plusieurs photos, ou une
 * vidéo (2 minutes au plus), depuis la galerie du téléphone, l'ordinateur
 * ou la caméra. Chaque média part dès qu'il est choisi (barre de
 * progression) ; on peut le retirer avant de publier.
 */
export default function Composer({
  prenom, onPublished, autoFocus = false,
}: {
  prenom?: string;
  onPublished: (post: SocialPost) => void;
  autoFocus?: boolean;
}) {
  const [contenu, setContenu] = useState("");
  const [audience, setAudience] = useState<SocialPost["audience"]>("public");
  const [elements, setElements] = useState<Element[]>([]);
  const [camera, setCamera] = useState<"photo" | "video" | null>(null);
  const [publication, setPublication] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<MediaConfig>(CONFIG_PAR_DEFAUT);
  const champPhotos = useRef<HTMLInputElement>(null);
  const champVideo = useRef<HTMLInputElement>(null);
  const elementsRef = useRef<Element[]>([]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    authFetch("/social/media/config").then(async (r) => {
      if (r.ok) setConfig({ ...CONFIG_PAR_DEFAUT, ...(await r.json()) });
    }).catch(() => {});
    // Libère les aperçus en quittant la page.
    return () => elementsRef.current.forEach((e) => URL.revokeObjectURL(e.apercu));
  }, []);

  const maj = (cle: string, changement: Partial<Element>) =>
    setElements((liste) => liste.map((e) => (e.cle === cle ? { ...e, ...changement } : e)));

  const aDeLaVideo = elements.some((e) => e.type === "video");
  const nbPhotos = elements.filter((e) => e.type === "image").length;

  const ajouterPhotos = async (fichiers: File[]) => {
    setMessage("");
    if (aDeLaVideo) {
      setMessage("Une publication contient soit des photos, soit une vidéo : retirez d'abord la vidéo.");
      return;
    }
    const place = config.images_max - nbPhotos;
    if (place <= 0) {
      setMessage(`${config.images_max} photos au plus par publication.`);
      return;
    }
    if (fichiers.length > place) setMessage(`Seules ${place} photo(s) ont été ajoutées (${config.images_max} au plus).`);
    for (const fichier of fichiers.slice(0, place)) {
      const cle = `${Date.now()}-${Math.random()}`;
      const apercu = URL.createObjectURL(fichier);
      setElements((liste) => [...liste, { cle, type: "image", apercu, etat: "envoi", progression: 0 }]);
      try {
        const photo = await preparerPhoto(fichier);
        if (photo.blob.size > config.image_max_mb * 1048576) throw new Error(`Photo trop lourde (${config.image_max_mb} Mo au plus).`);
        const envoi = televerserMedia(photo.blob, photo.nom, { width: photo.width, height: photo.height },
          (p) => maj(cle, { progression: p }));
        maj(cle, { annuler: envoi.annuler });
        const media = await envoi.promesse;
        maj(cle, { etat: "pret", media, progression: 100, annuler: undefined });
      } catch (e) {
        maj(cle, { etat: "erreur", erreur: e instanceof Error ? e.message : "Envoi impossible.", annuler: undefined });
      }
    }
  };

  const ajouterVideo = async (fichier: File) => {
    setMessage("");
    if (elements.length > 0) {
      setMessage("Une vidéo se publie seule : retirez d'abord les autres médias.");
      return;
    }
    if (fichier.size > config.video_max_mb * 1048576) {
      setMessage(`Vidéo trop lourde (${config.video_max_mb} Mo au plus).`);
      return;
    }
    const cle = `${Date.now()}`;
    const apercu = URL.createObjectURL(fichier);
    setElements([{ cle, type: "video", apercu, etat: "envoi", progression: 0 }]);
    try {
      const infos = await analyserVideo(fichier).catch(() => ({ duree: 0, width: 0, height: 0, poster: null }));
      if (infos.duree > config.video_max_seconds + 0.5) {
        throw new Error(`Vidéo trop longue (${duree(infos.duree)}) : ${Math.round(config.video_max_seconds / 60 * 10) / 10} minutes au plus.`);
      }
      maj(cle, { duree: infos.duree });
      const envoi = televerserMedia(fichier, fichier.name || "video.mp4",
        { poster: infos.poster, width: infos.width, height: infos.height, duration: infos.duree || undefined },
        (p) => maj(cle, { progression: p }));
      maj(cle, { annuler: envoi.annuler });
      const media = await envoi.promesse;
      maj(cle, { etat: "pret", media, progression: 100, annuler: undefined });
    } catch (e) {
      maj(cle, { etat: "erreur", erreur: e instanceof Error ? e.message : "Envoi impossible.", annuler: undefined });
    }
  };

  const retirer = (element: Element) => {
    element.annuler?.();
    if (element.media?.id) authFetch(`/social/media/${element.media.id}`, { method: "DELETE" }).catch(() => {});
    URL.revokeObjectURL(element.apercu);
    setElements((liste) => liste.filter((e) => e.cle !== element.cle));
  };

  const enCours = elements.some((e) => e.etat === "envoi");
  const enErreur = elements.some((e) => e.etat === "erreur");
  const prets = elements.filter((e) => e.etat === "pret" && e.media?.id);
  const publiable = !publication && !enCours && !enErreur && (contenu.trim().length > 0 || prets.length > 0);

  const publier = async () => {
    if (!publiable) return;
    setPublication(true);
    setMessage("");
    try {
      const r = await authFetch("/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contenu, audience, media_ids: prets.map((e) => e.media?.id) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(data?.error || "Publication refusée.");
      } else {
        elements.forEach((e) => URL.revokeObjectURL(e.apercu));
        setElements([]);
        setContenu("");
        onPublished(data.post);
      }
    } catch {
      setMessage("Connexion perdue : réessayez.");
    }
    setPublication(false);
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow" id="publier">
      <label htmlFor="composeur-texte" className="sr-only">Votre publication</label>
      <textarea
        id="composeur-texte"
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        placeholder={prenom ? `Quoi de neuf, ${prenom} ?` : "Quoi de neuf ?"}
        className="w-full resize-none rounded-xl border border-gray-200 p-3 text-black"
        rows={3}
        maxLength={5000}
        autoFocus={autoFocus}
      />

      {elements.length > 0 && (
        <div className={`mt-3 grid gap-2 ${elements[0].type === "video" ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4"}`}>
          {elements.map((e) => (
            <div key={e.cle} className="relative overflow-hidden rounded-xl bg-gray-100">
              {e.type === "image" ? (
                <img src={e.apercu} alt="Aperçu" className="aspect-square w-full object-cover" />
              ) : (
                <video src={e.apercu} controls playsInline preload="metadata" className="max-h-80 w-full bg-black" />
              )}
              {e.etat === "envoi" && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-yellow-400 transition-all" style={{ width: `${e.progression}%` }} />
                  </div>
                  <p className="mt-0.5 text-center text-[11px] font-bold text-white">Envoi… {e.progression} %</p>
                </div>
              )}
              {e.etat === "erreur" && (
                <p className="absolute inset-x-0 bottom-0 bg-red-700/90 p-1.5 text-center text-[11px] font-bold text-white">{e.erreur}</p>
              )}
              {e.type === "video" && e.duree ? (
                <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white">{duree(e.duree)}</span>
              ) : null}
              <button type="button" onClick={() => retirer(e)} className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white"
                aria-label="Retirer ce média">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <button type="button" onClick={() => champPhotos.current?.click()} disabled={aDeLaVideo}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800 disabled:opacity-40">
          <ImagePlus size={17} className="text-green-700" /> Photo
        </button>
        <button type="button" onClick={() => champVideo.current?.click()} disabled={elements.length > 0}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800 disabled:opacity-40">
          <Film size={17} className="text-red-700" /> Vidéo
        </button>
        <button type="button" onClick={() => setCamera(nbPhotos > 0 ? "photo" : "video")} disabled={aDeLaVideo}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800 disabled:opacity-40">
          <Camera size={17} className="text-blue-700" /> Caméra
        </button>
        <label className="sr-only" htmlFor="composeur-audience">Qui peut voir</label>
        <select
          id="composeur-audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value as SocialPost["audience"])}
          className="ml-auto rounded-xl border border-gray-200 p-2 text-sm font-semibold text-black"
        >
          {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <button
          type="button"
          onClick={publier}
          disabled={!publiable}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-2.5 font-black text-black disabled:opacity-50 sm:w-auto"
        >
          {publication || enCours ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {enCours ? "Envoi des médias…" : "Publier"}
        </button>
      </div>
      {message && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{message}</p>}

      <input ref={champPhotos} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" multiple hidden
        onChange={(e) => { ajouterPhotos(Array.from(e.target.files || [])); e.target.value = ""; }} />
      <input ref={champVideo} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) ajouterVideo(f); e.target.value = ""; }} />

      {camera && (
        <CameraCapture
          mode={camera}
          dureeMax={config.video_max_seconds}
          onClose={() => setCamera(null)}
          onResult={(fichier) => {
            setCamera(null);
            if (fichier.type.startsWith("video/")) ajouterVideo(fichier);
            else ajouterPhotos([fichier]);
          }}
        />
      )}
    </div>
  );
}
