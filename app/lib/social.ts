"use client";

/**
 * MaliLink Social côté navigateur : types partagés, téléversement des
 * médias (avec progression), compression des photos, miniature et durée des
 * vidéos, enregistrement depuis la caméra.
 *
 * Le serveur reste juge : il relit le type réel de chaque fichier, mesure
 * la durée et refuse ce qui dépasse. Ce qui est fait ici sert à aller vite
 * sur un téléphone (photo allégée avant l'envoi, refus immédiat d'une vidéo
 * trop longue) — jamais à remplacer un contrôle serveur.
 */

import { apiUrl, authHeaders } from "./api";

export type SocialMedia = {
  id: string | null;
  type: "image" | "video";
  src: string;
  poster: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
};

export type SocialPost = {
  id: number;
  user_id: number;
  content: string;
  media: SocialMedia[];
  audience: "public" | "friends" | "followers" | "me";
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  display_name: string;
  author_photo: string;
  verified_level: string;
  created_at: string;
};

export type NetworkSummary = {
  demandes_recues: number;
  demandes_envoyees: number;
  demandes_abonnement: number;
  amis: number;
  abonnes: number;
  abonnements: number;
  matchs: number;
  messages_non_lus: number;
};

export const AUDIENCES: { value: SocialPost["audience"]; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "friends", label: "Amis" },
  { value: "followers", label: "Abonnés" },
  { value: "me", label: "Moi uniquement" },
];

/* Les URL de médias renvoyées par le serveur sont relatives à l'API. */
export const mediaUrl = (src: string | null | undefined) => (src ? apiUrl(src) : "");

export function tempsEcoule(value: string) {
  const secondes = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  if (secondes < 3600) return `il y a ${Math.floor(secondes / 60)} min`;
  if (secondes < 86400) return `il y a ${Math.floor(secondes / 3600)} h`;
  if (secondes < 7 * 86400) return `il y a ${Math.floor(secondes / 86400)} j`;
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export const duree = (secondes: number | null | undefined) => {
  const s = Math.max(0, Math.round(Number(secondes) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export type MediaConfig = { video_max_seconds: number; video_max_mb: number; image_max_mb: number; images_max: number };
export const CONFIG_PAR_DEFAUT: MediaConfig = { video_max_seconds: 120, video_max_mb: 150, image_max_mb: 10, images_max: 10 };

/* ---------------------------------------------------------------------
   Photos : redimensionnées à 2048 px et recompressées en JPEG avant
   l'envoi (une photo de téléphone passe de 5 Mo à ~500 Ko). Les GIF
   animés sont envoyés tels quels.
   --------------------------------------------------------------------- */
export async function preparerPhoto(fichier: File): Promise<{ blob: Blob; width: number; height: number; nom: string }> {
  if (fichier.type === "image/gif") return { blob: fichier, width: 0, height: 0, nom: fichier.name };
  const url = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Photo illisible : choisissez une photo JPEG ou PNG."));
      img.src = url;
    });
    const max = 2048;
    const ratio = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * ratio);
    const height = Math.round(image.naturalHeight * ratio);
    const toile = document.createElement("canvas");
    toile.width = width;
    toile.height = height;
    toile.getContext("2d")?.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => toile.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) return { blob: fichier, width, height, nom: fichier.name };
    return { blob, width, height, nom: fichier.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------------------------------------------------------------
   Vidéos : durée, dimensions et miniature lues dans le navigateur.
   --------------------------------------------------------------------- */
export async function analyserVideo(source: Blob): Promise<{ duree: number; width: number; height: number; poster: Blob | null }> {
  const url = URL.createObjectURL(source);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Vidéo illisible par ce navigateur."));
    });
    // Une vidéo enregistrée (WebM) annonce parfois une durée infinie : on
    // force le navigateur à la calculer en se plaçant très loin.
    let dureeLue = video.duration;
    if (!Number.isFinite(dureeLue)) {
      video.currentTime = 1e7;
      await new Promise((resolve) => { video.ontimeupdate = resolve; setTimeout(resolve, 1500); });
      dureeLue = video.duration;
      video.currentTime = 0;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    let poster: Blob | null = null;
    try {
      video.currentTime = Math.min(0.5, Number.isFinite(dureeLue) ? dureeLue / 2 : 0.5);
      await new Promise((resolve) => { video.onseeked = resolve; setTimeout(resolve, 2000); });
      const max = 960;
      const ratio = Math.min(1, max / Math.max(width || 1, height || 1));
      const toile = document.createElement("canvas");
      toile.width = Math.max(1, Math.round((width || 640) * ratio));
      toile.height = Math.max(1, Math.round((height || 360) * ratio));
      toile.getContext("2d")?.drawImage(video, 0, 0, toile.width, toile.height);
      poster = await new Promise<Blob | null>((resolve) => toile.toBlob(resolve, "image/jpeg", 0.8));
    } catch {
      poster = null;
    }
    return { duree: Number.isFinite(dureeLue) ? dureeLue : 0, width, height, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------------------------------------------------------------
   Téléversement avec progression (XMLHttpRequest : fetch ne la donne pas).
   --------------------------------------------------------------------- */
export function televerserMedia(
  fichier: Blob,
  nom: string,
  extra: { poster?: Blob | null; width?: number; height?: number; duration?: number },
  onProgress?: (pourcentage: number) => void,
): { promesse: Promise<SocialMedia>; annuler: () => void } {
  const xhr = new XMLHttpRequest();
  const promesse = new Promise<SocialMedia>((resolve, reject) => {
    const donnees = new FormData();
    donnees.append("file", fichier, nom);
    if (extra.poster) donnees.append("poster", extra.poster, "miniature.jpg");
    if (extra.width) donnees.append("width", String(extra.width));
    if (extra.height) donnees.append("height", String(extra.height));
    if (extra.duration) donnees.append("duration", String(extra.duration));
    xhr.open("POST", apiUrl("/social/media"));
    authHeaders().forEach((valeur, cle) => {
      if (cle.toLowerCase() !== "content-type") xhr.setRequestHeader(cle, valeur);
    });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let reponse: { media?: SocialMedia; error?: string } = {};
      try { reponse = JSON.parse(xhr.responseText); } catch { /* corps vide */ }
      if (xhr.status >= 200 && xhr.status < 300 && reponse.media) resolve(reponse.media);
      else reject(new Error(reponse.error || (xhr.status === 413 ? "Fichier trop volumineux." : "Téléversement refusé.")));
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi."));
    xhr.onabort = () => reject(new Error("Envoi annulé."));
    xhr.send(donnees);
  });
  return { promesse, annuler: () => xhr.abort() };
}

/* Le meilleur format d'enregistrement vidéo que ce navigateur sait produire. */
export function formatEnregistrement(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidats = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidats.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function messageCamera(erreur: unknown): string {
  const nom = erreur instanceof Error ? erreur.name : "";
  if (nom === "NotAllowedError" || nom === "SecurityError") {
    return "Accès à la caméra refusé : autorisez-le dans les réglages du navigateur, ou choisissez un fichier.";
  }
  if (nom === "NotFoundError" || nom === "OverconstrainedError") return "Aucune caméra disponible sur cet appareil.";
  if (nom === "NotReadableError") return "La caméra est déjà utilisée par une autre application.";
  return "La caméra n'a pas pu démarrer : choisissez un fichier à la place.";
}
