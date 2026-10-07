"use client";

import { useEffect, useState } from "react";
import { authFetch, getAuthToken } from "./api";

/* Appels MaliLink Social : configuration (activée seulement quand LiveKit
   est en service côté serveur), types et déclenchement d'un appel depuis
   n'importe quel écran (messagerie, profil). */

export type AppelConfig = { enabled: boolean; video: boolean; url: string | null; sonnerie_secondes: number };
export type Appel = {
  id: string;
  kind: "audio" | "video";
  status: "ringing" | "accepted" | "refused" | "cancelled" | "missed" | "ended" | "failed";
  direction: "sortant" | "entrant";
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  other?: { user_id: number; display_name: string; avatar_url: string | null };
};

const DESACTIVE: AppelConfig = { enabled: false, video: false, url: null, sonnerie_secondes: 45 };
let cache: { at: number; valeur: AppelConfig } | null = null;

export async function chargerConfigAppels(): Promise<AppelConfig> {
  if (cache && Date.now() - cache.at < 60_000) return cache.valeur;
  if (!getAuthToken()) return DESACTIVE;
  try {
    const r = await authFetch("/social/calls/config", { cache: "no-store" });
    const valeur = r.ok ? ((await r.json()) as AppelConfig) : DESACTIVE;
    cache = { at: Date.now(), valeur };
    return valeur;
  } catch {
    return DESACTIVE;
  }
}

/** Configuration des appels (désactivés tant que le serveur ne dit pas le contraire). */
export function useConfigAppels() {
  const [config, setConfig] = useState<AppelConfig>(cache?.valeur || DESACTIVE);
  useEffect(() => {
    let actif = true;
    chargerConfigAppels().then((c) => { if (actif) setConfig(c); });
    return () => { actif = false; };
  }, []);
  return config;
}

export type DemandeAppel = { userId: number; kind: "audio" | "video"; nom: string; photo?: string | null };

/** Lance un appel ; le gestionnaire monté dans la navigation Social s'en charge. */
export function lancerAppel(demande: DemandeAppel) {
  window.dispatchEvent(new CustomEvent<DemandeAppel>("malilink:appeler", { detail: demande }));
}

export const dureeAppel = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};

export const LIBELLES_STATUT: Record<Appel["status"], string> = {
  ringing: "Sonnerie", accepted: "En cours", refused: "Refusé", cancelled: "Annulé", missed: "Manqué", ended: "Terminé", failed: "Échec",
};
