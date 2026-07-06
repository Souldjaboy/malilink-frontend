"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Search } from "lucide-react";
import { apiUrl } from "../../lib/api";
import { formatFCFA } from "../../lib/format";
import BusinessRequestButton from "../../components/BusinessRequestButton";

type Property = {
  id: number;
  company_id: number;
  company_name: string;
  type: string;
  title: string;
  description: string;
  address: string;
  city: string;
  surface: string | number;
  rooms_count: number;
  price_sale: string | number;
  price_rent_day: string | number;
  price_rent_month: string | number;
};

const TYPE_LABELS: Record<string, string> = {
  maison: "Maison",
  appartement: "Appartement",
  terrain: "Terrain",
  bureau: "Bureau",
  boutique: "Boutique",
  chambre_hotel: "Chambre d’hôtel",
  hotel: "Hôtel",
};

export default function ClientImmobilierPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (q = query, c = city) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (c) params.set("city", c);
      const response = await fetch(apiUrl(`/public/properties?${params.toString()}`));
      const data = await response.json().catch(() => []);
      setProperties(Array.isArray(data) ? data : []);
    } catch {
      setProperties([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load("", "");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-6 text-white shadow">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-black">
              <Building2 size={26} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white md:text-3xl">Immobilier & hôtels</h1>
              <p className="text-sm text-white/75">Maisons, appartements, terrains et chambres publiés par les agences MaliLink.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3">
              <Search size={18} className="shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Maison, appartement, agence..."
                className="w-full border-0 bg-transparent p-3 text-black outline-none"
              />
            </div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Ville (ex : Bamako)"
              className="rounded-xl bg-white p-3 text-black sm:w-48"
            />
            <button onClick={() => load()} className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Rechercher
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center font-semibold text-gray-500">Chargement des biens...</p>
        ) : properties.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-bold text-gray-700">Aucun bien disponible pour le moment.</p>
            <p className="mt-2 text-sm text-gray-500">Les agences immobilières ajoutent leurs biens régulièrement.</p>
            <Link href="/marketplace" className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Explorer la marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const isHotel = property.type === "chambre_hotel" || property.type === "hotel";
              const title = property.title || TYPE_LABELS[property.type] || "Bien immobilier";
              return (
                <div key={property.id} className="flex flex-col rounded-2xl bg-white p-5 shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ml-navy,#0f1b3d)] text-[var(--ml-gold,#d4a23c)]">
                      <Building2 size={22} />
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                      {TYPE_LABELS[property.type] || property.type}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-black text-black">{title}</h2>
                  <p className="text-sm text-gray-500">
                    {[property.city, property.rooms_count ? `${property.rooms_count} pièce(s)` : "", Number(property.surface) > 0 ? `${property.surface} m²` : ""]
                      .filter(Boolean)
                      .join(" · ") || property.address || "Détails auprès de l’agence"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{property.company_name}</p>
                  <div className="mt-3 flex-1 space-y-1 text-sm font-bold text-black">
                    {Number(property.price_sale) > 0 && <p>Achat : {formatFCFA(Number(property.price_sale))}</p>}
                    {Number(property.price_rent_month) > 0 && <p>Location : {formatFCFA(Number(property.price_rent_month))} / mois</p>}
                    {Number(property.price_rent_day) > 0 && <p>{isHotel ? "Nuitée" : "Location"} : {formatFCFA(Number(property.price_rent_day))} / jour</p>}
                  </div>
                  <BusinessRequestButton
                    className="mt-4"
                    companyId={property.company_id}
                    module={isHotel ? "hotel" : "immobilier"}
                    itemId={property.id}
                    itemLabel={title}
                    requestType={isHotel ? "réservation" : "location ou achat"}
                    label={isHotel ? "Réserver" : "Je suis intéressé"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
