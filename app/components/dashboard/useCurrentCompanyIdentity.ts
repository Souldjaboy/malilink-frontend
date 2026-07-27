"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl, authFetch } from "../../lib/api";
import { productConfig } from "../../lib/product-config";
import type { CompanyIdentity } from "./dashboardTypes";

const CACHE_KEY = "malilink_company_identity";
export const COMPANY_UPDATED_EVENT = "malilink-company-updated";

type RawIdentity = {
  company_id?: number | string | null;
  company_name?: string | null;
  logo_url?: string | null;
  business_type?: string | null;
  plan_name?: string | null;
  subscription_status?: string | null;
  is_platform?: boolean;
} | null;

/**
 * Normalise l'URL d'un logo entreprise :
 * - conserve les URL absolues (http, https, data:) ;
 * - préfixe les chemins relatifs (/uploads/…) par l'URL de l'API ;
 * - renvoie null pour les valeurs vides afin d'éviter une image cassée.
 */
export function normalizeCompanyLogoUrl(value?: string | null): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) return v;
  return apiUrl(v);
}

function readCache(): RawIdentity {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RawIdentity) : null;
  } catch {
    return null;
  }
}

function writeCache(identity: RawIdentity) {
  if (typeof window === "undefined") return;
  try {
    if (identity) window.localStorage.setItem(CACHE_KEY, JSON.stringify(identity));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Vide le cache d'identité (à appeler à la déconnexion). */
export function clearCompanyIdentityCache() {
  writeCache(null);
}

/**
 * Source de vérité de l'identité entreprise :
 * 1) l'API /company-settings/current (scopée côté serveur par l'utilisateur) ;
 * 2) le cache local, uniquement comme secours temporaire anti-clignotement.
 *
 * Écoute l'événement `malilink-company-updated` pour se rafraîchir immédiatement
 * après une modification (nom / logo) sans reconnexion.
 */
export function useCurrentCompanyIdentity(): CompanyIdentity {
  const [raw, setRaw] = useState<RawIdentity>(() => readCache());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await authFetch("/company-settings/current", { cache: "no-store" });
      if (!response.ok) {
        setIsLoading(false);
        return;
      }
      const data = (await response.json()) as RawIdentity;
      setRaw(data);
      writeCache(data);
    } catch {
      /* garde le cache / le fallback */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Rafraîchissement immédiat après modification du nom / logo.
  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as RawIdentity;
      if (detail) {
        setRaw((prev) => ({ ...(prev || {}), ...detail }));
        writeCache(detail);
      } else {
        load();
      }
    };
    window.addEventListener(COMPANY_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(COMPANY_UPDATED_EVENT, onUpdated);
  }, [load]);

  return useMemo<CompanyIdentity>(() => {
    const isPlatform = Boolean(raw?.is_platform);
    const rawName = String(raw?.company_name || "").trim();
    const companyName = rawName || productConfig.name;
    const companyLogoUrl = isPlatform ? null : normalizeCompanyLogoUrl(raw?.logo_url);
    const companyInitial = (companyName.trim().charAt(0) || "M").toUpperCase();
    return {
      companyId: raw?.company_id ?? null,
      companyName,
      companyLogoUrl,
      companyInitial,
      businessType: String(raw?.business_type || "").trim(),
      planName: String(raw?.plan_name || "").trim(),
      subscriptionStatus: String(raw?.subscription_status || "").trim(),
      isPlatform,
      hasCustomLogo: Boolean(companyLogoUrl),
      isLoading,
      refresh: load,
    };
  }, [raw, isLoading, load]);
}
