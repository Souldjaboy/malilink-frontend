"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

type Mission = {
  id: number;
  mission_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: string | null;
  price_estimate: string | null;
  driver_phone?: string | null;
  driver_vehicle?: string | null;
  driver_rating?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "Recherche d'un livreur...",
  acceptee: "Livreur en route vers le point de départ",
  recuperee: "Colis récupéré",
  en_route: "En route vers la destination",
  livree: "Livré ✓",
  terminee: "Terminé ✓",
  annulee: "Annulé",
};

export default function ClientLivraisonPage() {
  const [form, setForm] = useState({
    mission_type: "livraison",
    pickup_address: "",
    dropoff_address: "",
    package_description: "",
    recipient_name: "",
    recipient_phone: "",
    payment_method: "especes",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ratingFor, setRatingFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);

  const loadMissions = useCallback(async () => {
    const res = await authFetch("/delivery/missions/client");
    if (res.ok) setMissions(await res.json());
  }, []);

  useEffect(() => {
    loadMissions();
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null)
      );
    }
  }, [loadMissions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await authFetch("/delivery/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pickup_lat: coords?.lat,
          pickup_lng: coords?.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Erreur lors de la demande");
        return;
      }
      setMessage(`Demande créée ! Prix estimé : ${data.price_estimate ? formatFCFA(Number(data.price_estimate)) : "—"}`);
      setForm({ ...form, pickup_address: "", dropoff_address: "", package_description: "", recipient_name: "", recipient_phone: "" });
      await loadMissions();
    } finally {
      setLoading(false);
    }
  };

  const sendRating = async (missionId: number) => {
    await authFetch(`/delivery/missions/${missionId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setRatingFor(null);
    await loadMissions();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-black text-gray-900">Livraison · Coursier · Taxi</h1>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "livraison", label: "🛵 Livraison" },
              { value: "coursier", label: "📦 Coursier" },
              { value: "taxi", label: "🚕 Taxi" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, mission_type: t.value })}
                className={`rounded-xl p-3 font-bold ${
                  form.mission_type === t.value ? "bg-yellow-500 text-black" : "bg-gray-100 text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Point de départ (A)</label>
            <input
              value={form.pickup_address}
              onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
              placeholder="Adresse de récupération"
              required
            />
            {coords && <p className="mt-1 text-xs text-green-600">Position GPS détectée ✓</p>}
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Destination (B)</label>
            <input
              value={form.dropoff_address}
              onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
              placeholder="Adresse de livraison"
              required
            />
          </div>

          {form.mission_type !== "taxi" && (
            <>
              <div>
                <label className="mb-1 block font-semibold text-gray-800">Description du colis</label>
                <input
                  value={form.package_description}
                  onChange={(e) => setForm({ ...form, package_description: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  placeholder="Ex: repas, documents, petit colis..."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  placeholder="Nom du destinataire"
                />
                <input
                  value={form.recipient_phone}
                  onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  placeholder="Téléphone du destinataire"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Paiement</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
            >
              <option value="especes">Espèces à la livraison</option>
              <option value="orange_money">Orange Money</option>
              <option value="wave">Wave</option>
              <option value="moov_money">Moov Money</option>
            </select>
          </div>

          {message && <p className="rounded-xl bg-blue-50 p-3 font-semibold text-blue-800">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-500 p-4 font-black text-black disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Demander maintenant"}
          </button>
        </form>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Mes demandes</h2>
          {missions.length === 0 && <p className="mt-3 text-gray-500">Aucune demande pour l&apos;instant.</p>}
          <div className="mt-3 space-y-3">
            {missions.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-200 p-4">
                <p className="font-bold text-gray-900">
                  #{m.id} · {STATUS_LABELS[m.status] || m.status}
                </p>
                <p className="text-sm text-gray-600">{m.pickup_address} → {m.dropoff_address}</p>
                <p className="text-sm text-gray-500">
                  {m.price_estimate ? `Prix : ${formatFCFA(Number(m.price_estimate))}` : ""}
                  {m.driver_phone ? ` · Livreur : ${m.driver_phone} (${m.driver_vehicle || "?"})` : ""}
                </p>
                {(m.status === "livree" || m.status === "terminee") && (
                  ratingFor === m.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="rounded-lg border border-gray-300 p-2 text-gray-900"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>{n} ★</option>
                        ))}
                      </select>
                      <button onClick={() => sendRating(m.id)} className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white">
                        Envoyer
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRatingFor(m.id)} className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white">
                      Noter le livreur
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
