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
  modules: Record<string, boolean>;
  disabled_keys: string[];
  permissions: PermissionRow[];
};

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
      .then((data) => setMe(data))
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
    (key: string) => {
      if (!me) return true; // avant chargement : ne rien masquer (évite le clignotement)
      if (me.is_super_admin) return true;
      const disabled = new Set(me.disabled_keys || []);
      const parent = key.split(".")[0];
      if (disabled.has(parent)) return false;
      if (key.includes(".") && disabled.has(key)) return false;
      if (!key.includes(".") && me.modules && me.modules[key] === false) return false;
      return true;
    },
    [me]
  );

  /** L'utilisateur peut-il effectuer `action` sur `key` ? */
  const can = useCallback(
    (key: string, action: string) => {
      if (!me) return true;
      if (me.is_super_admin) return true;
      if (!isEnabled(key)) return false;
      const rows = me.permissions || [];
      const row =
        rows.find((p) => p.module_key === key) ||
        rows.find((p) => p.module_key === key.split(".")[0]);
      if (!row) return true; // aucune règle explicite → autorisé
      const col = ACTION_COLUMN[action] || "can_view";
      const value = row[col];
      return value === null || value === undefined ? true : value === true;
    },
    [me, isEnabled]
  );

  return { me, loading, isEnabled, can, reload: load };
}
