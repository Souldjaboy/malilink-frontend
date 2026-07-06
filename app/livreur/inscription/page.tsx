"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, authFetch } from "../../lib/api";

/* Inscription livreur en UNE étape :
   - visiteur sans compte → création compte (téléphone + mot de passe)
     + profil livreur en un seul envoi (/delivery/drivers/public-register)
   - utilisateur déjà connecté → simple création du profil livreur
     (/delivery/drivers/register, comportement historique conservé) */
export default function LivreurInscriptionPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
    city: "",
    driver_type: "livreur",
    vehicle_type: "moto",
    vehicle_plate: "",
    license_number: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLoggedIn(
      Boolean(localStorage.getItem("token") || localStorage.getItem("business_token"))
    );
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isLoggedIn) {
      if (form.password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }
      if (form.password !== form.confirm_password) {
        setError("Les deux mots de passe ne sont pas identiques.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLoggedIn) {
        const res = await authFetch("/delivery/drivers/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driver_type: form.driver_type,
            vehicle_type: form.vehicle_type,
            vehicle_plate: form.vehicle_plate,
            license_number: form.license_number,
            phone: form.phone,
          }),
        });
        const data = await res.json();
        if (!res.ok && res.status !== 409) {
          setError(data?.error || "Erreur lors de l'inscription");
          return;
        }
        router.push("/livreur");
        return;
      }

      const res = await fetch(apiUrl("/delivery/drivers/public-register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Erreur lors de l'inscription. Réessayez.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("business_token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("business_user", JSON.stringify(data.user));
      document.cookie = `triangle_token=${encodeURIComponent(data.token)}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `triangle_business_token=${encodeURIComponent(data.token)}; path=/; max-age=86400; SameSite=Lax`;

      setSuccess(data.message || "Compte créé avec succès.");
      router.push("/livreur");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-black text-gray-900">Devenir livreur, coursier ou taxi</h1>
        <p className="mt-2 text-gray-600">
          {isLoggedIn
            ? "Complète ton profil pour recevoir des missions proches de toi."
            : "Crée ton compte avec ton numéro de téléphone et commence à recevoir des missions."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow">
          {!isLoggedIn && (
            <>
              <div>
                <label className="mb-1 block font-semibold text-gray-800">Nom complet</label>
                <input
                  value={form.fullname}
                  onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  placeholder="Ex : Moussa Traoré"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-gray-800">
                  Numéro de téléphone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  placeholder="Ex : 74 32 92 25"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-gray-800">Mot de passe</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-gray-800">Confirmer</label>
                  <input
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-gray-800">
                    Ville / zone
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                    placeholder="Ex : Bamako"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-gray-800">
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
                  />
                </div>
              </div>
            </>
          )}

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
            <label className="mb-1 block font-semibold text-gray-800">
              Plaque d&apos;immatriculation (optionnel)
            </label>
            <input
              value={form.vehicle_plate}
              onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
              placeholder="Ex: AB-1234-ML"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-800">
              Numéro de permis (optionnel)
            </label>
            <input
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900"
            />
          </div>

          {isLoggedIn && (
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
          )}

          {error && <p className="font-semibold text-red-600">{error}</p>}
          {success && <p className="font-semibold text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-500 p-4 font-black text-black disabled:opacity-50"
          >
            {loading
              ? "Création..."
              : isLoggedIn
                ? "Créer mon profil livreur"
                : "Créer mon compte livreur"}
          </button>

          {!isLoggedIn && (
            <p className="text-center text-sm text-gray-600">
              Déjà inscrit ?{" "}
              <a href="/login" className="font-bold text-gray-900 underline">
                Connectez-vous avec votre numéro de téléphone
              </a>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
