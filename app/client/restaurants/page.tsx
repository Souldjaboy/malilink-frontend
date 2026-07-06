"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Utensils } from "lucide-react";
import { apiUrl } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

type Restaurant = {
  company_id: number;
  company_name: string;
  address: string;
  phone: string;
  menu_count: number;
  min_price: string | number;
  max_price: string | number;
};

export default function ClientRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (q = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const response = await fetch(apiUrl(`/public/restaurants?${params.toString()}`));
      const data = await response.json().catch(() => []);
      setRestaurants(Array.isArray(data) ? data : []);
    } catch {
      setRestaurants([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load("");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-6 text-white shadow">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-black">
              <Utensils size={26} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white md:text-3xl">Restaurants</h1>
              <p className="text-sm text-white/75">Découvrez les menus des restaurants MaliLink.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3">
              <Search size={18} className="shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Nom du restaurant..."
                className="w-full border-0 bg-transparent p-3 text-black outline-none"
              />
            </div>
            <button onClick={() => load()} className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Rechercher
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center font-semibold text-gray-500">Chargement des restaurants...</p>
        ) : restaurants.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-bold text-gray-700">Aucun restaurant disponible pour le moment.</p>
            <p className="mt-2 text-sm text-gray-500">Les restaurants publient leurs menus régulièrement.</p>
            <Link href="/marketplace" className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Explorer la marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <div key={restaurant.company_id} className="flex flex-col rounded-2xl bg-white p-5 shadow">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ml-navy,#0f1b3d)] text-[var(--ml-gold,#d4a23c)]">
                  <Utensils size={22} />
                </div>
                <h2 className="mt-3 text-lg font-black text-black">{restaurant.company_name}</h2>
                <p className="text-sm text-gray-500">{restaurant.address || "Adresse auprès du restaurant"}</p>
                <div className="mt-3 flex-1 text-sm font-bold text-black">
                  <p>{restaurant.menu_count} plat(s) au menu</p>
                  {Number(restaurant.min_price) > 0 && (
                    <p className="text-gray-600">
                      À partir de {formatFCFA(Number(restaurant.min_price))}
                    </p>
                  )}
                </div>
                <Link
                  href={`/client/restaurants/${restaurant.company_id}`}
                  className="mt-4 rounded-xl bg-yellow-500 px-4 py-3 text-center font-black text-black"
                >
                  Voir le menu
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
