"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass, Home, MessageCircle, PlusSquare, ShoppingBag, UserCircle2, Users } from "lucide-react";
import { appProduct } from "../lib/product-config";
import { authFetch, getAuthToken } from "../lib/api";
import type { NetworkSummary } from "../lib/social";

type Onglet = {
  href: string;
  label: string;
  icon: typeof Home;
  actif: (chemin: string) => boolean;
  compteur?: (r: NetworkSummary | null) => number;
};

const ACCUEIL: Onglet = { href: "/social", label: "Accueil", icon: Home, actif: (c) => c === "/social" };
const DECOUVRIR: Onglet = { href: "/social/decouvrir", label: "Découvrir", icon: Compass, actif: (c) => c.startsWith("/social/decouvrir") };
const PUBLIER: Onglet = { href: "/social/publier", label: "Publier", icon: PlusSquare, actif: (c) => c.startsWith("/social/publier") };
const MESSAGES: Onglet = {
  href: "/social/messages", label: "Messages", icon: MessageCircle, actif: (c) => c.startsWith("/social/messages"),
  compteur: (r) => r?.messages_non_lus || 0,
};
const RESEAU: Onglet = {
  href: "/social/reseau", label: "Réseau", icon: Users, actif: (c) => c.startsWith("/social/reseau") || c.startsWith("/social/amis"),
  compteur: (r) => (r?.demandes_recues || 0) + (r?.demandes_abonnement || 0),
};
const PROFIL: Onglet = {
  href: "/social/profil", label: "Profil", icon: UserCircle2,
  actif: (c) => c.startsWith("/social/profil") || c.startsWith("/social/settings"),
};
const MARKETPLACE: Onglet = { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, actif: (c) => c.startsWith("/marketplace") };

const ORDINATEUR = [ACCUEIL, DECOUVRIR, PUBLIER, MESSAGES, RESEAU, PROFIL, MARKETPLACE];
const MOBILE_BAS = [ACCUEIL, DECOUVRIR, PUBLIER, MESSAGES, RESEAU];

function Pastille({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -right-2 -top-1.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-black leading-[18px] text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/* Navigation MaliLink Social. Ordinateur : les sept entrées dans l'en-tête.
   Mobile : cinq onglets en bas (Accueil, Découvrir, Publier, Messages,
   Réseau), Profil et Marketplace en haut à droite. Rendue uniquement sur le
   produit malilink. Les compteurs se rafraîchissent chaque minute. */
export default function SocialNav() {
  const pathname = usePathname() || "";
  const [resume, setResume] = useState<NetworkSummary | null>(null);

  useEffect(() => {
    if (appProduct !== "malilink" || !getAuthToken()) return;
    let actif = true;
    const charger = () =>
      authFetch("/social/network/summary", { cache: "no-store" })
        .then(async (r) => { if (actif && r.ok) setResume(await r.json()); })
        .catch(() => {});
    charger();
    const minuterie = setInterval(charger, 60_000);
    const auRetour = () => { if (document.visibilityState === "visible") charger(); };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      actif = false;
      clearInterval(minuterie);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [pathname]);

  if (appProduct !== "malilink") return null;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 bg-[var(--ml-navy,#0f1b3d)] px-3 py-2 md:px-4">
        <Link href="/social" className="flex min-w-0 items-center gap-2.5">
          <img src="/brands/malilink-logo-officiel.jpg" alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          <span className="truncate font-black text-white">
            MaliLink <span className="text-[var(--ml-gold,#d4a23c)]">Social</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation MaliLink Social">
          {ORDINATEUR.map((onglet) => {
            const actif = onglet.actif(pathname);
            return (
              <Link
                key={onglet.href}
                href={onglet.href}
                aria-current={actif ? "page" : undefined}
                data-nav-sombre
                className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                  actif ? "bg-yellow-500 text-black" : "text-white hover:bg-white/10"
                }`}
              >
                <span className="relative">
                  <onglet.icon size={17} aria-hidden="true" />
                  <Pastille n={onglet.compteur?.(resume) || 0} />
                </span>
                {onglet.label}
              </Link>
            );
          })}
        </nav>
        {/* Mobile et tablette : Profil et Marketplace en haut. */}
        <div className="flex items-center gap-1 lg:hidden">
          {[PROFIL, MARKETPLACE].map((onglet) => {
            const actif = onglet.actif(pathname);
            return (
              <Link key={onglet.href} href={onglet.href} aria-label={onglet.label} aria-current={actif ? "page" : undefined}
                data-nav-sombre
                className={`flex flex-col items-center rounded-xl px-2 py-1 text-[10px] font-bold ${
                  actif ? "text-[var(--ml-gold,#d4a23c)]" : "text-white/85"
                }`}>
                <onglet.icon size={21} aria-hidden="true" />
                {onglet.label}
              </Link>
            );
          })}
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[var(--ml-navy,#0f1b3d)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Navigation MaliLink Social">
        {MOBILE_BAS.map((onglet) => {
          const actif = onglet.actif(pathname);
          const publier = onglet === PUBLIER;
          return (
            <Link
              key={onglet.href}
              href={onglet.href}
              aria-current={actif ? "page" : undefined}
                data-nav-sombre
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${
                actif ? "text-[var(--ml-gold,#d4a23c)]" : "text-white/80"
              }`}
            >
              <span className={`relative ${publier ? "rounded-xl bg-yellow-500 px-3 py-1 text-black" : ""}`}>
                <onglet.icon size={publier ? 20 : 21} aria-hidden="true" />
                <Pastille n={onglet.compteur?.(resume) || 0} />
              </span>
              {onglet.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
