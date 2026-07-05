"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "../../lib/api";

export default function LivreurInscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    driver_type: "livreur",
    vehicle_type: "moto",
    vehicle_plate: "",
    license_number: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authFetch("/delivery/drivers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setError(data?.error || "Erreur lors de l'inscription");
        return;
      }
      router.push("/livreur");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-black text-gray-900">Devenir livreur, coursier ou taxi</h1>
        <p className="mt-2 text-gray-600">
          Complète ton profil pour recevoir des missions proches de toi.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow">
          <div>
            <label className="mb-1 block font-semibold text-gray-800">Type d&apos;activité</label>
            <select
              value={form.driver_type}
              onChange={(e) => setForm({ ...form, driver_type: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
            >
              <option value="livreur">Livreur (repas, colis marketplace)</option>
              <option value="coursier">Coursier (courses locales)</option>
              <option value="taxi">Chauffeur taxi</option>
              <option value="transporteur">Transporteur (B2B)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Véhicule</label>
            <select
              value={form.vehicle_type}
              onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
            >
              <option value="moto">Moto</option>
              <option value="voiture">Voiture</option>
              <option value="tricycle">Tricycle</option>
              <option value="camion">Camion</option>
              <option value="velo">Vélo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Plaque d&apos;immatriculation</label>
            <input
              value={form.vehicle_plate}
              onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
              placeholder="Ex: AB-1234-ML"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Numéro de permis</label>
            <input
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
              placeholder="+223 ..."
              required
            />
          </div>

          {error && <p className="font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-500 p-4 font-black text-black disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon profil livreur"}
          </button>
        </form>
      </div>
    </div>
  );
}
