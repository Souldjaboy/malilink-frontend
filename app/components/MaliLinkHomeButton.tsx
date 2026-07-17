"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { appProduct } from "../lib/product-config";

/* Bouton flottant « Accueil MaliLink » : toujours visible, ramène chaque
   rôle vers SON espace d'accueil. Rendu uniquement sur le produit malilink. */
export default function MaliLinkHomeButton() {
  const pathname = usePathname();
  const [home, setHome] = useState("/");

  useEffect(() => {
    const readRole = () => {
      try {
        const business = localStorage.getItem("business_user") || localStorage.getItem("user");
        const client = localStorage.getItem("client_user");
        const user = business ? JSON.parse(business) : client ? JSON.parse(client) : null;
        const role = String(user?.role || "").toLowerCase();
        if (!user) return "/";
        if (role === "livreur") return "/livreur";
        if (role === "customer") {
          // Client sur le réseau social → accueil social, sinon espace client.
          return pathname?.startsWith("/social") ? "/social" : "/client/dashboard";
        }
        if (role === "super_admin") return "/super-admin";
        return "/dashboard"; // entreprise / employés
      } catch {
        return "/";
      }
    };
    setHome(readRole());
  }, [pathname]);

  if (appProduct !== "malilink") return null;
  // Inutile sur la page d'accueil elle-même et sur les écrans d'auth.
  if (["/", "/login", "/register", "/client/login", "/client/register"].includes(pathname || "")) {
    return null;
  }
  if (pathname === home) return null;
  // La messagerie a sa propre barre d'actions en bas : pas de bouton flottant.
  if (pathname?.startsWith("/social/messages")) return null;

  return (
    <Link
      href={home}
      aria-label="Accueil MaliLink"
      className="fixed bottom-20 left-4 z-[45] flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--ml-gold,#d4a23c)] bg-[var(--ml-navy,#0f1b3d)] shadow-2xl transition hover:scale-105 md:bottom-6"
    >
      <img
        src="/brands/malilink-logo-officiel.jpg"
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    </Link>
  );
}
