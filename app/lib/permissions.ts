"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "./api";

/** Colonne user_permissions correspondant à chaque action. */
export const ACTION_COLUMN: Record<string, string> = {
  view: "can_view",
  create: "can_create",
  update: "can_edit",
  delete: "can_delete",
  validate: "can_validate",
  import: "can_import",
  export: "can_export",
  print: "can_print",
  cancel: "can_cancel",
  share: "can_share",
};

export type PermissionRow = { module_key: string } & Record<string, boolean | null>;

export type RbacMe = {
  role: string;
  is_super_admin: boolean;
  business_profile?: string;
  has_company?: boolean;
  modules: Record<string, boolean>;
  disabled_keys: string[];
  permissions: PermissionRow[];
  /** Verdict final calculé par le backend (même moteur que les gardes API). */
  effective?: Record<string, Record<string, boolean>>;
  /** Préfixe de page → module, pour garder les URL directes. */
  page_routes?: Array<[string, string]>;
};

/** Normalise quelques alias rencontrés dans les pages. */
const KEY_ALIASES: Record<string, string> = {
  stocks: "stock", inventaires: "inventaire", produit: "produits", partenaire: "partenaires",
  travel: "voyage", voyages: "voyage", assistant: "ia", assistant_ia: "ia", finance: "comptabilite",
  compta: "comptabilite", attendance: "pointage", livreur: "livraison", restaurants: "restaurant",
  alerte: "alertes", reseaux_sociaux: "marketing",
};
export function normalizePermissionKey(key: string): string {
  const clean = String(key || "").trim().toLowerCase();
  return clean.includes(".") ? clean : KEY_ALIASES[clean] || clean;
}

/* Le middleware (edge) ne peut pas interroger l'API à chaque page : il lit
   un cookie. Posé seulement à la connexion, il restait périmé après un
   changement du super-admin. On le réécrit à chaque lecture de /rbac/me,
   avec le verdict « Voir » — droits de l'utilisateur compris. */
export function refreshModulesCookie(me: RbacMe) {
  if (typeof document === "undefined" || !me.effective || me.is_super_admin) return;
  const vues: Record<string, boolean> = {};
  for (const [key, actions] of Object.entries(me.effective)) {
    if (!key.includes(".")) vues[key] = actions.view === true;
  }
  document.cookie = `triangle_modules=${encodeURIComponent(JSON.stringify(vues))}; path=/; max-age=86400; SameSite=Lax`;
}

/** Module gouvernant une page (préfixe le plus long), ou null. */
export function moduleForPathIn(me: RbacMe | null, pathname: string): string | null {
  const regles = me?.page_routes || [];
  const p = String(pathname || "").replace(/\/$/, "");
  let meilleur: [string, string] | null = null;
  for (const regle of regles) {
    if ((p === regle[0] || p.startsWith(`${regle[0]}/`)) && (!meilleur || regle[0].length > meilleur[0].length)) {
      meilleur = regle;
    }
  }
  return meilleur ? meilleur[1] : null;
}

/** Verdict « Voir » du backend pour une clé (true si le backend ne la connaît pas). */
export function effectiveView(me: RbacMe | null, rawKey: string): boolean {
  if (!me || me.is_super_admin) return true;
  const verdict = me.effective?.[normalizePermissionKey(rawKey)];
  return verdict && typeof verdict.view === "boolean" ? verdict.view : true;
}

/**
 * Hook central des droits de l'utilisateur courant (miroir frontend du RBAC
 * backend). Sert à masquer dynamiquement modules/sous-modules et actions.
 * Règle : DÉFAUT = AUTORISÉ ; on masque uniquement sur désactivation/refus
 * explicite.
 */
export function usePermissions() {
  const [me, setMe] = useState<RbacMe | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/rbac/me", { cache: "no-store" })
      .then(async (r) => (r.ok ? ((await r.json()) as RbacMe) : null))
      .then((data) => {
        if (data) refreshModulesCookie(data);
        setMe(data);
      })
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener("malilink-permissions-updated", onUpdate);
    return () => window.removeEventListener("malilink-permissions-updated", onUpdate);
  }, [load]);

  /** Un module ou sous-module (`parent.enfant`) est-il actif pour l'entreprise ? */
  const isEnabled = useCallback(
    (rawKey: string) => {
      if (!me) return true; // avant chargement : ne rien masquer (évite le clignotement)
      if (me.is_super_admin) return true;
      const key = normalizePermissionKey(rawKey);
      const disabled = new Set(me.disabled_keys || []);
      if (disabled.has(key)) return false;
      const parent = key.split(".")[0];
      if (disabled.has(parent)) return false;
      if (!key.includes(".") && me.modules && me.modules[key] === false) return false;
      return true;
    },
    [me]
  );

  /** L'utilisateur peut-il effectuer `action` sur `key` ?
      Lit le verdict du backend : plus aucun recalcul divergent côté client. */
  const can = useCallback(
    (rawKey: string, action: string) => {
      if (!me) return true;
      if (me.is_super_admin) return true;
      const key = normalizePermissionKey(rawKey);
      if (!isEnabled(key)) return false;
      const verdict = me.effective?.[key];
      if (verdict && typeof verdict[action] === "boolean") return verdict[action];
      // Clé inconnue du backend : repli sur les lignes brutes (ancien comportement).
      const rows = me.permissions || [];
      const row = rows.find((p) => p.module_key === key) || rows.find((p) => p.module_key === key.split(".")[0]);
      if (!row) return true;
      const col = ACTION_COLUMN[action] || "can_view";
      const value = row[col];
      return value === null || value === undefined ? true : value === true;
    },
    [me, isEnabled]
  );

  const moduleForPath = useCallback((pathname: string) => moduleForPathIn(me, pathname), [me]);

  return { me, loading, isEnabled, can, moduleForPath, reload: load };
}
