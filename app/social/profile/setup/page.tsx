"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getAuthToken } from "../../../lib/api";
import SocialNav from "../../../components/SocialNav";

const GOAL_OPTIONS: { value: string; label: string }[] = [
  { value: "amitie", label: "Amitié" },
  { value: "discussion", label: "Discussion" },
  { value: "reseau_professionnel", label: "Réseau professionnel" },
  { value: "partenariat_commercial", label: "Partenariat commercial" },
  { value: "activites_sorties", label: "Activités et sorties" },
  { value: "collaborateurs", label: "Trouver des collaborateurs" },
  { value: "suivre_createurs", label: "Suivre des créateurs" },
  { value: "decouvrir", label: "Découvrir de nouvelles personnes" },
];

export default function SocialProfileSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    birth_date: "",
    photo_url: "",
    city: "",
    country: "Mali",
    languages: "français",
    profession: "",
    bio: "",
    interests: "",
    is_public: true,
  });
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login?redirect=/social/profile/setup");
      return;
    }
    // Pré-remplir depuis le compte MaliLink existant.
    const stored = localStorage.getItem("client_user") || localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      setForm((current) => ({
        ...current,
        display_name: current.display_name || user.fullname || "",
      }));
    }
    authFetch("/social/me")
      .then((response) => response.json())
      .then((data) => {
        if (data?.activated && data.profile) {
          const profile = data.profile;
          setForm({
            display_name: profile.display_name || "",
            username: profile.username || "",
            birth_date: profile.birth_date ? String(profile.birth_date).slice(0, 10) : "",
            photo_url: profile.photo_url || "",
            city: profile.city || "",
            country: profile.country || "Mali",
            languages: (profile.languages || []).join(", "),
            profession: profile.profession || "",
            bio: profile.bio || "",
            interests: (profile.interests || []).join(", "),
            is_public: profile.is_public !== false,
          });
          setGoals(Array.isArray(profile.goals) ? profile.goals : []);
        }
      })
      .catch(() => {});
  }, [router]);

  const age = (() => {
    if (!form.birth_date) return null;
    const date = new Date(form.birth_date);
    const now = new Date();
    let value = now.getFullYear() - date.getFullYear();
    if (
      now.getMonth() < date.getMonth() ||
      (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
    )
      value -= 1;
    return value;
  })();
  const toggleGoal = (value: string) => {
    setGoals((current) =>
      current.includes(value) ? current.filter((goal) => goal !== value) : [...current, value]
    );
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const uploadData = new FormData();
      uploadData.append("photo", file);
      const response = await authFetch("/upload-user-photo", { method: "POST", body: uploadData });
      const data = await response.json().catch(() => ({}));
      if (data.profile_image_url) {
        setForm((current) => ({ ...current, photo_url: data.profile_image_url }));
      } else {
        setError(data.error || "Erreur upload de la photo.");
      }
    } catch {
      setError("Erreur réseau pendant l'upload de la photo.");
    }
    setUploadingPhoto(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.photo_url) {
      setError("La photo de profil est obligatoire pour utiliser MaliLink Social.");
      return;
    }
    setSaving(true);
    try {
      const response = await authFetch("/social/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean),
          interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean),
          goals,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Erreur d'activation du profil.");
      } else {
        router.push("/social");
      }
    } catch {
      setError("Erreur réseau. Réessayez.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-5">
        <h1 className="text-2xl font-black text-black">Mon profil social</h1>
        <p className="mt-1 text-sm text-gray-500">
          Un seul compte MaliLink : ce profil active simplement votre espace social.
          Vous contrôlez ce qui est visible.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow">
          {error && <p className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-bold text-black">Nom affiché *</label>
            <input
              value={form.display_name}
              onChange={(event) => setForm({ ...form, display_name: event.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-black"
              required
              maxLength={80}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-black">Pseudonyme</label>
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                className="w-full rounded-xl border border-gray-200 p-3 text-black"
                placeholder="ex : moussa_bko"
                maxLength={30}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Date de naissance * <span className="font-normal text-gray-400">(jamais publique)</span>
              </label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
                className="w-full rounded-xl border border-gray-200 p-3 text-black"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-black">
              Photo de profil * <span className="font-normal text-gray-400">(obligatoire)</span>
            </label>
            <div className="flex items-center gap-3">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Photo de profil" className="h-16 w-16 rounded-full border-2 border-yellow-500 object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">
                  Photo
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
                className="min-w-0 flex-1 text-sm text-gray-600"
              />
            </div>
            {uploadingPhoto && <p className="mt-1 text-sm font-bold text-blue-600">Upload en cours...</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-black">Ville</label>
            <input
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-black"
              placeholder="Bamako"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-black">Profession</label>
            <input
              value={form.profession}
              onChange={(event) => setForm({ ...form, profession: event.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-black"
              placeholder="ex : Commerçante, Développeur, Étudiant..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-black">Biographie</label>
            <textarea
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-black"
              rows={3}
              maxLength={1000}
              placeholder="Présentez-vous en quelques mots..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-black">
              Centres d&apos;intérêt <span className="font-normal text-gray-400">(séparés par des virgules)</span>
            </label>
            <input
              value={form.interests}
              onChange={(event) => setForm({ ...form, interests: event.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-black"
              placeholder="football, musique, business, cuisine..."
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-black">Que cherchez-vous sur MaliLink Social ?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((goal) => (
                <label
                  key={goal.value}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm font-semibold ${
                    goals.includes(goal.value)
                      ? "border-yellow-500 bg-yellow-50 text-black"
                      : "border-gray-200 text-black"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={goals.includes(goal.value)}
                    onChange={() => toggleGoal(goal.value)}
                  />
                  {goal.label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 p-3 text-sm font-semibold text-black">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(event) => setForm({ ...form, is_public: event.target.checked })}
            />
            Profil public (les autres membres peuvent voir mon profil)
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-yellow-500 py-4 font-black text-black disabled:opacity-50"
          >
            {saving ? "Activation..." : "Activer mon profil social"}
          </button>
        </form>
      </main>
    </div>
  );
}
