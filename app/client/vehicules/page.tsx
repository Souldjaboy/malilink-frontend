"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Car, Search } from "lucide-react";
import { apiUrl } from "../../lib/api";
import { formatFCFA } from "../../lib/format";
import BusinessRequestButton from "../../components/BusinessRequestButton";

type Vehicle = {
  id: number;
  company_id: number;
  company_name: string;
  marque: string;
  modele: string;
  annee: number | null;
  couleur: string;
  carburant: string;
  prix_vente: string | number;
  prix_location_jour: string | number;
  prix_location_mois: string | number;
};

export default function ClientVehiculesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (q = query, t = type) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (t) params.set("type", t);
      const response = await fetch(apiUrl(`/public/vehicles?${params.toString()}`));
      const data = await response.json().catch(() => []);
      setVehicles(Array.isArray(data) ? data : []);
    } catch {
      setVehicles([]);
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
              <Car size={26} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white md:text-3xl">Véhicules disponibles</h1>
              <p className="text-sm text-white/75">Achat et location, publiés par les garages et agences MaliLink.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3">
              <Search size={18} className="shrink-0 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Marque, modèle, entreprise..."
                className="w-full border-0 bg-transparent p-3 text-black outline-none"
              />
            </div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                load(query, e.target.value);
              }}
              className="rounded-xl bg-white p-3 text-black"
            >
              <option value="">Achat et location</option>
              <option value="vente">Achat</option>
              <option value="location">Location</option>
            </select>
            <button onClick={() => load()} className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Rechercher
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-center font-semibold text-gray-500">Chargement des véhicules...</p>
        ) : vehicles.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow">
            <p className="font-bold text-gray-700">Aucun véhicule disponible pour le moment.</p>
            <p className="mt-2 text-sm text-gray-500">Revenez bientôt, les garages ajoutent leurs véhicules chaque jour.</p>
            <Link href="/marketplace" className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Explorer la marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const title = `${vehicle.marque} ${vehicle.modele}`.trim() || "Véhicule";
              const forSale = Number(vehicle.prix_vente) > 0;
              const forRent = Number(vehicle.prix_location_jour) > 0 || Number(vehicle.prix_location_mois) > 0;
              return (
                <div key={vehicle.id} className="flex flex-col rounded-2xl bg-white p-5 shadow">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ml-navy,#0f1b3d)] text-[var(--ml-gold,#d4a23c)]">
                    <Car size={22} />
                  </div>
                  <h2 className="mt-3 text-lg font-black text-black">{title}</h2>
                  <p className="text-sm text-gray-500">
                    {[vehicle.annee, vehicle.couleur, vehicle.carburant].filter(Boolean).join(" · ") || "Détails chez le vendeur"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{vehicle.company_name}</p>
                  <div className="mt-3 flex-1 space-y-1 text-sm font-bold text-black">
                    {forSale && <p>Achat : {formatFCFA(Number(vehicle.prix_vente))}</p>}
                    {Number(vehicle.prix_location_jour) > 0 && <p>Location : {formatFCFA(Number(vehicle.prix_location_jour))} / jour</p>}
                    {Number(vehicle.prix_location_mois) > 0 && <p>Location : {formatFCFA(Number(vehicle.prix_location_mois))} / mois</p>}
                  </div>
                  <BusinessRequestButton
                    className="mt-4"
                    companyId={vehicle.company_id}
                    module="automobile"
                    itemId={vehicle.id}
                    itemLabel={title}
                    requestType={forSale && !forRent ? "achat" : forRent && !forSale ? "location" : "achat ou location"}
                    label={forSale && !forRent ? "Demander l’achat" : forRent && !forSale ? "Demander la location" : "Je suis intéressé"}
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
