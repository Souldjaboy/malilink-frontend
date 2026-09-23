"use client";

/**
 * Sélection des modules à l'inscription : type d'activité + offre + choix.
 *
 * Avant : le formulaire cochait les 29 modules par défaut et affichait
 * « 29 / 5 » sans rien contrôler, et le backend activait en plus tout module
 * que le formulaire ne mentionnait pas. Une boutique recevait Restaurant,
 * Éducation, Laboratoire…
 *
 * Les règles viennent de /public/business-profiles, la même source que celle
 * qu'applique le backend à l'inscription :
 *   - le profil métier fournit la sélection de départ ;
 *   - l'offre retire ce qu'elle n'inclut pas ;
 *   - une verticale hors profil ne se choisit pas ici (le super-admin peut
 *     l'accorder ensuite) ;
 *   - la limite de l'offre compte les modules AJOUTÉS au-delà du profil.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "../lib/api";

export type CatalogEntry = { key: string; label: string; group: string; core: boolean; vertical: boolean };
type Payload = {
  profiles: Array<{ key: string; label: string; modules: string[] }>;
  catalog: CatalogEntry[];
  groups: Record<string, string>;
};
type PlanLike = { name?: string; display_name?: string; max_modules_allowed?: number | string; excluded_modules?: string[] } | null;

export type ModuleCard = CatalogEntry & {
  selected: boolean;
  inProfile: boolean;
  excludedByPlan: boolean;
};

export function useRegistrationModules(businessType: string, plan: PlanLike) {
  const [data, setData] = useState<Payload | null>(null);
  // Choix de l'utilisateur, remis à zéro quand le type d'activité change.
  const [etat, setEtat] = useState<{ profil: string; choix: Record<string, boolean> }>({ profil: "", choix: {} });

  useEffect(() => {
    fetch(apiUrl("/public/business-profiles"))
      .then(async (r) => (r.ok ? ((await r.json()) as Payload) : null))
      .then((payload) => setData(payload))
      .catch(() => setData(null));
  }, []);

  const profilCle = businessType && data?.profiles.some((p) => p.key === businessType) ? businessType : businessType ? "autre" : "";
  const profil = useMemo(() => data?.profiles.find((p) => p.key === profilCle) || null, [data, profilCle]);
  const choix = useMemo(() => (etat.profil === profilCle ? etat.choix : {}), [etat, profilCle]);
  const exclus = useMemo(() => new Set(plan?.excluded_modules || []), [plan]);
  const limite = Number(plan?.max_modules_allowed || 0);
  const illimite = limite <= 0 || limite >= 999;

  const cards: ModuleCard[] = useMemo(() => {
    if (!data || !profil) return [];
    const dansProfil = new Set(profil.modules);
    return data.catalog
      .filter((m) => !m.core)
      // Une verticale d'un autre métier n'est pas proposée ; les options
      // (caméras, marketing) le sont, selon l'offre.
      .filter((m) => !m.vertical || m.group === "options" || dansProfil.has(m.key))
      .map((m) => {
        const excludedByPlan = exclus.has(m.key);
        const parDefaut = dansProfil.has(m.key);
        const selected = !excludedByPlan && (choix[m.key] ?? parDefaut);
        return { ...m, selected, inProfile: parDefaut, excludedByPlan };
      });
  }, [data, profil, choix, exclus]);

  const ajouts = cards.filter((c) => c.selected && !c.inProfile);

  // Nom commercial (Starter, Business…), pas l'identifiant interne (Essentiel…).
  const nomOffre = plan?.display_name || plan?.name || "";

  /** Renvoie un message d'erreur si le choix est impossible, sinon null. */
  const toggle = useCallback(
    (key: string): string | null => {
      const carte = cards.find((c) => c.key === key);
      if (!carte) return null;
      if (carte.excludedByPlan) return `« ${carte.label} » n'est pas inclus dans l'offre ${nomOffre}.`;
      const activer = !carte.selected;
      if (activer && !carte.inProfile && !illimite && ajouts.length >= limite) {
        return `L'offre ${nomOffre} permet d'ajouter ${limite} module(s) au-delà de votre activité.`;
      }
      setEtat({ profil: profilCle, choix: { ...choix, [key]: activer } });
      return null;
    },
    [cards, nomOffre, illimite, ajouts.length, limite, profilCle, choix]
  );

  /** Carte explicite clé → bool, envoyée telle quelle au backend. */
  const payload = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const c of cards) out[c.key] = c.selected;
    return out;
  }, [cards]);

  return {
    ready: Boolean(data),
    profileLabel: profil?.label || "",
    groups: data?.groups || {},
    cards,
    added: ajouts,
    limit: illimite ? null : limite,
    toggle,
    payload,
  };
}
