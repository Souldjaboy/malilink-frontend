"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Wallet,
  CalendarDays,
  Car,
  LogOut,
  PackageCheck,
  ShoppingCart,
  TestTube2,
  Truck,
  User,
  Utensils,
} from "lucide-react";
import { useEffect, useState } from "react";
import { appProduct, productConfig } from "../../lib/product-config";
import { authFetch } from "../../lib/api";

export default function ClientDashboardPage() {
  const router = useRouter();
  const isMaliLink = appProduct === "malilink";
  const [profile, setProfile] = useState<{ full_name?: string; photo_url?: string } | null>(null);

  useEffect(() => {
    authFetch("/marketplace/customers/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setProfile(data))
      .catch(() => {});
  }, []);

  const initials = (profile?.full_name || "C")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    document.cookie = "triangle_token=; path=/; max-age=0";
    document.cookie = "triangle_client_token=; path=/; max-age=0";
    router.push("/marketplace");
  };

  const cards = [
    { href: "/marketplace", label: "Marketplace", description: "Acheter des produits", icon: ShoppingCart, show: true },
    { href: "/client/orders", label: "Mes commandes", description: "Suivre mes achats", icon: PackageCheck, show: true },
    { href: "/wallet", label: "MaliLink Wallet", description: "Solde, transferts et reçus", icon: Wallet, show: isMaliLink },
    { href: "/social", label: "MaliLink Social", description: "Communauté, amis et réseau pro", icon: User, show: isMaliLink },
    { href: "/client/livraison", label: "Livraison / Taxi", description: "Demander et suivre une course", icon: Truck, show: isMaliLink },
    { href: "/client/restaurants", label: "Restaurants", description: "Voir les menus, commander", icon: Utensils, show: isMaliLink },
    { href: "/client/vehicules", label: "Véhicules", description: "Achat et location", icon: Car, show: isMaliLink },
    { href: "/client/immobilier", label: "Immobilier / Hôtel", description: "Biens et réservations", icon: Building2, show: isMaliLink },
    { href: "/marketplace/cart", label: "Mon panier", description: "Finaliser mes achats", icon: ShoppingCart, show: true },
    { href: "/client/laboratoire/rendez-vous", label: "Mes rendez-vous", description: "Laboratoires et analyses", icon: CalendarDays, show: true },
    { href: "/client/laboratoire/resultats", label: "Résultats laboratoire", description: "Consulter mes résultats", icon: TestTube2, show: true },
    { href: "/client/profile", label: "Mon profil", description: "Mes informations", icon: User, show: true },
  ].filter((card) => card.show);

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      <div className="rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-6 text-white shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {isMaliLink && (
              <img
                src="/brands/malilink-logo-officiel.jpg"
                alt="MaliLink Global"
                className="h-14 w-14 rounded-2xl object-cover"
              />
            )}
            <div>
              <p className="font-bold text-yellow-400">
                {isMaliLink ? "MaliLink Global" : "Triangle Marketplace"}
              </p>
              <div className="mt-1 flex items-center gap-3">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name || "Client"}
                    className="h-11 w-11 rounded-full border-2 border-yellow-500 object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-500 font-black text-black">
                    {initials}
                  </span>
                )}
                <h1 className="text-3xl font-black text-white md:text-4xl">
                  {profile?.full_name ? profile.full_name.split(" ")[0] : "Espace client"}
                </h1>
              </div>
              <p className="mt-1 text-white/70">
                {isMaliLink
                  ? "Achats, livraisons, restaurants, véhicules, immobilier et laboratoire."
                  : "Commandes, panier, factures, résultats laboratoire et profil."}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href + card.label}
              href={card.href}
              className="group rounded-2xl bg-white p-5 shadow transition hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500 text-black">
                <Icon size={24} />
              </div>
              <p className="mt-3 text-lg font-black text-black group-hover:text-yellow-600">{card.label}</p>
              <p className="text-sm text-gray-500">{card.description}</p>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        {productConfig.name} — vos données restent privées : vous ne voyez que vos commandes et demandes.
      </p>
    </div>
  );
}
