"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Phone, Utensils } from "lucide-react";
import { apiUrl } from "../../../lib/api";
import { formatFCFA } from "../../../lib/format";
import BusinessRequestButton from "../../../components/BusinessRequestButton";

type MenuItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: string | number;
  preparation_time: number;
};

export default function ClientRestaurantMenuPage() {
  const params = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(apiUrl(`/public/restaurants/${params.id}/menu`));
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data?.error || "Restaurant introuvable.");
          return;
        }
        setRestaurant(data.restaurant || null);
        setMenu(Array.isArray(data.menu) ? data.menu : []);
      } catch {
        setError("Erreur réseau. Réessayez.");
      } finally {
        setLoading(false);
      }
    };
    if (params?.id) load();
  }, [params?.id]);

  const categories = Array.from(new Set(menu.map((item) => item.category || "Plats")));

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/client/restaurants" className="inline-flex items-center gap-2 font-bold text-gray-600">
          <ArrowLeft size={18} /> Tous les restaurants
        </Link>

        {loading ? (
          <p className="mt-8 text-center font-semibold text-gray-500">Chargement du menu...</p>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-bold text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-6 text-white shadow">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-black">
                  <Utensils size={26} />
                </span>
                <div>
                  <h1 className="text-2xl font-black text-white md:text-3xl">{restaurant?.name}</h1>
                  <p className="text-sm text-white/75">{restaurant?.address || ""}</p>
                  {restaurant?.phone && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-yellow-400">
                      <Phone size={14} /> {restaurant.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {menu.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow">
                <p className="font-bold text-gray-700">Aucun plat disponible pour le moment.</p>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category} className="mt-6">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-1.5 rounded-full bg-yellow-500" aria-hidden="true" />
                    <h2 className="text-lg font-black text-black">{category}</h2>
                  </div>
                  <div className="mt-3 space-y-3">
                    {menu
                      .filter((item) => (item.category || "Plats") === category)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow">
                          <div className="min-w-0">
                            <p className="font-black text-black">{item.name}</p>
                            {item.description && <p className="truncate text-sm text-gray-500">{item.description}</p>}
                            {item.preparation_time > 0 && (
                              <p className="text-xs text-gray-400">Préparation ~ {item.preparation_time} min</p>
                            )}
                          </div>
                          <p className="shrink-0 font-black text-black">{formatFCFA(Number(item.price))}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}

            {restaurant && (
              <div className="mt-8 rounded-2xl bg-white p-5 shadow">
                <p className="font-bold text-black">Envie de commander ou de réserver une table ?</p>
                <p className="mt-1 text-sm text-gray-500">
                  Envoyez votre demande : le restaurant vous contactera pour confirmer.
                </p>
                <BusinessRequestButton
                  className="mt-3"
                  companyId={Number(params.id)}
                  module="restaurant"
                  itemLabel={restaurant?.name || "Restaurant"}
                  requestType="commande ou réservation"
                  label="Commander / Réserver"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
