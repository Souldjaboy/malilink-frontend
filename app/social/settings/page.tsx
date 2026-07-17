"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";

const PRIVACY_TOGGLES: { key: string; label: string }[] = [
  { key: "show_age", label: "Afficher mon âge" },
  { key: "show_city", label: "Afficher ma ville" },
  { key: "show_friends", label: "Afficher ma liste d'amis" },
  { key: "show_online", label: "Afficher mon statut en ligne" },
  { key: "show_last_seen", label: "Afficher ma dernière présence" },
  { key: "allow_suggestions", label: "Apparaître dans les suggestions" },
];

const PRIVACY_SELECTS: { key: string; label: string; options: [string, string][] }[] = [
  { key: "who_can_follow", label: "Qui peut me suivre", options: [["everyone", "Tout le monde"], ["approval", "Sur approbation"]] },
  { key: "who_can_friend", label: "Qui peut me demander en ami", options: [["everyone", "Tout le monde"], ["friends_of_friends", "Amis d'amis"], ["nobody", "Personne"]] },
  { key: "who_can_message", label: "Qui peut m'écrire", options: [["everyone", "Tout le monde"], ["friends", "Mes amis"], ["nobody", "Personne"]] },
  { key: "who_can_comment", label: "Qui peut commenter", options: [["everyone", "Tout le monde"], ["friends", "Mes amis"], ["nobody", "Personne"]] },
];

export default function SocialSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [privacy, setPrivacy] = useState<any>({});
  const [prefs, setPrefs] = useState<any>({ age_min: 18, age_max: 99, city: "", verified_only: false });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/social/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!data?.activated) {
          router.push("/social/profile/setup");
          return;
        }
        setMe(data);
        setPrivacy(data.privacy || {});
        setPrefs({
          age_min: data.preferences?.age_min ?? 18,
          age_max: data.preferences?.age_max ?? 99,
          city: data.preferences?.city || "",
          verified_only: data.preferences?.verified_only === true,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const save = async () => {
    setMessage("");
    const [privacyRes, prefsRes] = await Promise.all([
      authFetch("/social/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(privacy),
      }),
      authFetch("/social/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      }),
    ]);
    if (privacyRes.ok && prefsRes.ok) {
      setMessage("Paramètres enregistrés avec succès.");
    } else {
      const data = await privacyRes.json().catch(() => ({}));
      setMessage(data?.error || "Erreur enregistrement des paramètres.");
    }
  };

  const deactivate = async () => {
    if (!window.confirm("Désactiver votre profil social ? Votre compte MaliLink général restera actif.")) return;
    const response = await authFetch("/social/profile", { method: "DELETE" });
    if (response.ok) router.push("/social");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <SocialNav />
        <p className="mt-10 text-center font-semibold text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-black">Profil & confidentialité</h1>
          <Link href="/social/profile/setup" className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-black text-black">
            Modifier mon profil
          </Link>
        </div>

        {message && (
          <p className="mt-3 rounded-xl bg-green-50 p-3 font-bold text-green-700">{message}</p>
        )}

        <section className="mt-4 rounded-2xl bg-white p-5 shadow">
          <h2 className="font-black text-black">Confidentialité</h2>
          <p className="text-xs text-gray-500">
            Réglages appliqués par le serveur : personne ne peut les contourner.
          </p>
          <div className="mt-3 space-y-2">
            {PRIVACY_SELECTS.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-black">{item.label}</span>
                <select
                  value={privacy[item.key] || item.options[0][0]}
                  onChange={(event) => setPrivacy({ ...privacy, [item.key]: event.target.value })}
                  className="rounded-xl border border-gray-200 bg-white p-2 text-sm text-black"
                >
                  {item.options.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            ))}
            {PRIVACY_TOGGLES.map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm font-semibold text-black">{item.label}</span>
                <input
                  type="checkbox"
                  checked={privacy[item.key] === true}
                  onChange={(event) => setPrivacy({ ...privacy, [item.key]: event.target.checked })}
                  className="h-5 w-5"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-5 shadow">
          <h2 className="font-black text-black">Préférences de découverte</h2>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Âge minimum</label>
                <input
                  type="number"
                  min={13}
                  max={99}
                  value={prefs.age_min}
                  onChange={(event) => setPrefs({ ...prefs, age_min: Number(event.target.value) })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-black"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">Âge maximum</label>
                <input
                  type="number"
                  min={13}
                  max={99}
                  value={prefs.age_max}
                  onChange={(event) => setPrefs({ ...prefs, age_max: Number(event.target.value) })}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-black"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Ville préférée</label>
              <input
                value={prefs.city}
                onChange={(event) => setPrefs({ ...prefs, city: event.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-black"
                placeholder="Toutes les villes"
              />
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-black">Profils vérifiés uniquement</span>
              <input
                type="checkbox"
                checked={prefs.verified_only === true}
                onChange={(event) => setPrefs({ ...prefs, verified_only: event.target.checked })}
                className="h-5 w-5"
              />
            </label>
          </div>
        </section>

        <button
          onClick={save}
          className="mt-4 w-full rounded-xl bg-yellow-500 py-4 font-black text-black"
        >
          Enregistrer mes paramètres
        </button>

        <button
          onClick={deactivate}
          className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-3 font-bold text-red-700"
        >
          Désactiver mon profil social
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Votre compte MaliLink (achats, livraisons, entreprise) reste actif.
        </p>
      </main>
    </div>
  );
}
