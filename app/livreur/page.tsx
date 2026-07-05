"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../lib/api";
import { formatFCFA } from "../lib/format";
import AIChatWidget from "../components/AIChatWidget";

type Driver = {
  id: number;
  driver_type: string;
  vehicle_type: string;
  is_available: boolean;
  is_verified: boolean;
  rating_avg: string;
  rating_count: number;
  status: string;
};

type Mission = {
  id: number;
  mission_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: string | null;
  price_estimate: string | null;
  distance_to_pickup_km?: number | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
};

type Earnings = {
  missions_terminees: string;
  revenus_nets: string;
  commissions: string;
  rating_avg: string;
  rating_count: number;
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  recuperee: "Colis récupéré",
  en_route: "En route",
  livree: "Livrée",
  terminee: "Terminée",
  annulee: "Annulée",
};

export default function LivreurDashboardPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [nearby, setNearby] = useState<Mission[]>([]);
  const [myMissions, setMyMissions] = useState<Mission[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [message, setMessage] = useState("");

  const loadAll = useCallback(async () => {
    const res = await authFetch("/delivery/drivers/me");
    if (res.status === 404) {
      setNoProfile(true);
      return;
    }
    if (!res.ok) return;
    setDriver(await res.json());

    const [nearbyRes, missionsRes, earningsRes] = await Promise.all([
      authFetch("/delivery/missions/nearby"),
      authFetch("/delivery/missions/me"),
      authFetch("/delivery/drivers/me/earnings"),
    ]);
    if (nearbyRes.ok) setNearby(await nearbyRes.json());
    if (missionsRes.ok) setMyMissions(await missionsRes.json());
    if (earningsRes.ok) setEarnings(await earningsRes.json());
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleAvailability = async () => {
    if (!driver) return;
    const update = (lat?: number, lng?: number) =>
      authFetch("/delivery/drivers/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !driver.is_available, lat, lng }),
      }).then(() => loadAll());

    if (!driver.is_available && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => update(pos.coords.latitude, pos.coords.longitude),
        () => update()
      );
    } else {
      await update();
    }
  };

  const missionAction = async (id: number, action: string) => {
    setMessage("");
    const res = await authFetch(`/delivery/missions/${id}/${action}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMessage(data?.error || "Action impossible");
    await loadAll();
  };

  if (noProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-black text-gray-900">Espace livreur</h1>
          <p className="mt-3 text-gray-600">
            Tu n&apos;as pas encore de profil livreur. Crée-le en 1 minute pour commencer à recevoir des missions.
          </p>
          <Link
            href="/livreur/inscription"
            className="mt-6 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black"
          >
            Devenir livreur
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black">Espace livreur</h1>
              <p className="mt-1 text-white/70">
                {driver ? `${driver.driver_type} · ${driver.vehicle_type}` : "Chargement..."}
                {driver && !driver.is_verified && " · en attente de vérification"}
              </p>
            </div>
            {driver && (
              <button
                onClick={toggleAvailability}
                className={`rounded-xl px-6 py-3 font-black ${
                  driver.is_available ? "bg-green-500 text-black" : "bg-gray-600 text-white"
                }`}
              >
                {driver.is_available ? "Disponible ✓" : "Hors ligne — passer en ligne"}
              </button>
            )}
          </div>
          {earnings && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black">{earnings.missions_terminees}</p>
                <p className="text-sm text-white/70">Missions</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black">{formatFCFA(Number(earnings.revenus_nets))}</p>
                <p className="text-sm text-white/70">Revenus nets</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-2xl font-black">
                  {Number(earnings.rating_avg) > 0 ? `${earnings.rating_avg} ★` : "—"}
                </p>
                <p className="text-sm text-white/70">{earnings.rating_count} avis</p>
              </div>
            </div>
          )}
        </div>

        {message && <p className="rounded-xl bg-red-100 p-3 font-semibold text-red-700">{message}</p>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Missions disponibles près de toi</h2>
          {nearby.length === 0 && <p className="mt-3 text-gray-500">Aucune mission en attente pour le moment.</p>}
          <div className="mt-3 space-y-3">
            {nearby.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-gray-900">
                      {m.mission_type.toUpperCase()} · {m.price_estimate ? formatFCFA(Number(m.price_estimate)) : "prix à définir"}
                    </p>
                    <p className="text-sm text-gray-600">A : {m.pickup_address}</p>
                    <p className="text-sm text-gray-600">B : {m.dropoff_address}</p>
                    <p className="text-sm text-gray-500">
                      {m.distance_km ? `Trajet ${m.distance_km} km` : ""}
                      {m.distance_to_pickup_km != null ? ` · à ${m.distance_to_pickup_km} km de toi` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => missionAction(m.id, "accept")}
                    className="rounded-xl bg-yellow-500 px-5 py-3 font-black text-black"
                  >
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Mes missions</h2>
          {myMissions.length === 0 && <p className="mt-3 text-gray-500">Aucune mission pour l&apos;instant.</p>}
          <div className="mt-3 space-y-3">
            {myMissions.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-gray-900">
                      #{m.id} · {STATUS_LABELS[m.status] || m.status}
                    </p>
                    <p className="text-sm text-gray-600">{m.pickup_address} → {m.dropoff_address}</p>
                    {m.recipient_name && (
                      <p className="text-sm text-gray-500">
                        Destinataire : {m.recipient_name} {m.recipient_phone ? `· ${m.recipient_phone}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {m.status === "acceptee" && (
                      <button onClick={() => missionAction(m.id, "pickup")} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
                        Colis récupéré
                      </button>
                    )}
                    {m.status === "recuperee" && (
                      <button onClick={() => missionAction(m.id, "start")} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
                        En route
                      </button>
                    )}
                    {(m.status === "recuperee" || m.status === "en_route") && (
                      <button onClick={() => missionAction(m.id, "deliver")} className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">
                        Livré ✓
                      </button>
                    )}
                    {(m.status === "en_attente" || m.status === "acceptee") && (
                      <button onClick={() => missionAction(m.id, "cancel")} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AIChatWidget
        space="delivery_driver"
        suggestions={[
          "Aide-moi à comprendre ma mission de livraison",
          "Combien ai-je gagné ?",
          "Comment me rendre disponible ?",
        ]}
      />
    </div>
  );
}
