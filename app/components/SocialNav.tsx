"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, PlusSquare, Settings, Users } from "lucide-react";
import { appProduct } from "../lib/product-config";

const TABS = [
  { href: "/social", label: "Accueil", icon: Home },
  { href: "/social/decouvrir", label: "Découvrir", icon: Compass },
  { href: "/social?publier=1", label: "Publier", icon: PlusSquare, match: "__never__" },
  { href: "/social/amis", label: "Amis", icon: Users },
  { href: "/social/settings", label: "Profil", icon: Settings },
];

/* Navigation MaliLink Social : barre du bas sur mobile, barre du haut
   sur desktop. Rendue uniquement sur le produit malilink. */
export default function SocialNav() {
  const pathname = usePathname();
  if (appProduct !== "malilink") return null;

  return (
    <>
      {/* En-tête commun */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[var(--ml-navy,#0f1b3d)] px-4 py-2.5">
        <Link href="/social" className="flex items-center gap-2.5">
          <img
            src="/brands/malilink-logo-officiel.jpg"
            alt="MaliLink Social"
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="font-black text-white">
            MaliLink <span className="text-[var(--ml-gold,#d4a23c)]">Social</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                pathname === (tab.match ?? tab.href)
                  ? "bg-yellow-500 text-black"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <tab.icon size={17} />
              {tab.label}
            </Link>
          ))}
          <Link
            href="/marketplace"
            className="ml-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
          >
            Marketplace
          </Link>
        </nav>
      </header>

      {/* Barre du bas mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[var(--ml-navy,#0f1b3d)] md:hidden">
        {TABS.map((tab) => {
          const active = pathname === (tab.match ?? tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${
                active ? "text-[var(--ml-gold,#d4a23c)]" : "text-white/80"
              }`}
            >
              <tab.icon size={21} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
