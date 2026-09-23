"use client";

/**
 * Garde des URL directes.
 *
 * Masquer une carte ne suffit pas : taper /restaurant dans la barre
 * d'adresse ouvrait la page. Le middleware ne couvrait qu'une partie des
 * routes, via un cookie posé à la connexion — donc périmé après un changement
 * du super-admin, et ignorant les droits de l'utilisateur.
 *
 * Ici, le verdict vient de /rbac/me (même moteur que l'API), relu à chaque
 * navigation : un module retiré par le super-admin disparaît dès la page
 * suivante. L'API reste la vraie sécurité ; cette garde évite d'afficher un
 * écran rempli d'erreurs 403.
 *
 * Appel direct à fetch, pas authFetch : authFetch déconnecte sur 401, et un
 * visiteur portant un vieux jeton sur une page publique serait renvoyé vers
 * la connexion.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiUrl, authHeaders, getAuthToken } from "../lib/api";
import { effectiveView, moduleForPathIn, refreshModulesCookie, type RbacMe } from "../lib/permissions";

export default function ModuleRouteGuard() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [me, setMe] = useState<RbacMe | null>(null);

  useEffect(() => {
    if (!getAuthToken()) return;
    let annule = false;
    fetch(apiUrl("/rbac/me"), { headers: authHeaders(), cache: "no-store" })
      .then(async (r) => (r.ok ? ((await r.json()) as RbacMe) : null))
      .then((data) => {
        if (annule || !data) return;
        refreshModulesCookie(data);
        setMe(data);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!me || me.is_super_admin || me.has_company === false) return;
    if (String(me.role || "").toLowerCase() === "customer") return;
    const cle = moduleForPathIn(me, pathname);
    if (cle && !effectiveView(me, cle)) {
      router.replace(`/dashboard?module=${encodeURIComponent(cle)}`);
    }
  }, [me, pathname, router]);

  return null;
}
