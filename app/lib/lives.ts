"use client";

import { useEffect, useState } from "react";
import { authFetch, getAuthToken } from "./api";

/* Directs MaliLink Social : la disponibilité vient du SERVEUR, qui vérifie
   réellement le serveur média. Sans lui : « indisponible », aucun direct
   simulé. */

export type LivesConfig = {
  enabled: boolean;
  raison: string;
  url: string | null;
  verifications?: { configuration: boolean; drapeau: boolean; serveur: boolean };
};
export type Live = {
  id: string;
  title: string;
  audience: "public" | "friends" | "followers";
  status: "live" | "ended";
  started_at: string;
  ended_at: string | null;
  end_reason: string;
  comments_enabled: boolean;
  host: { user_id: number; display_name: string; photo_url: string | null };
  compteur?: { spectateurs: number; source: "serveur_media" | "presence"; hote_connecte: boolean | null } | null;
  est_hote?: boolean;
};
export type CommentaireLive = { id: number; user_id: number; content: string; created_at: string; display_name: string; photo_url: string | null };

export const AUDIENCES_LIVE = [
  { value: "public", label: "Public" },
  { value: "friends", label: "Amis" },
  { value: "followers", label: "Abonnés et amis" },
] as const;

export const RAISONS_INDISPONIBLE: Record<string, string> = {
  serveur_media_non_configure: "Le serveur vidéo des directs n'est pas encore installé.",
  fonction_desactivee: "Les directs ne sont pas encore ouverts.",
  dns_introuvable: "Le serveur vidéo des directs est introuvable (adresse non configurée).",
  serveur_injoignable: "Le serveur vidéo des directs ne répond pas.",
};

const INDISPONIBLE: LivesConfig = { enabled: false, raison: "", url: null };

export function useConfigLives() {
  const [config, setConfig] = useState<LivesConfig | null>(null);
  useEffect(() => {
    let actif = true;
    if (!getAuthToken()) { queueMicrotask(() => setConfig(INDISPONIBLE)); return; }
    authFetch("/social/lives/config", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : INDISPONIBLE))
      .then((c) => { if (actif) setConfig(c); })
      .catch(() => { if (actif) setConfig(INDISPONIBLE); });
    return () => { actif = false; };
  }, []);
  return config;
}

export const dureeDepuis = (iso: string, maintenant: number) => {
  const s = Math.max(0, Math.floor((maintenant - new Date(iso).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};
