"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "../../lib/api";

export default function ClientProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    country: "",
    city: "",
    address: "",
    photo_url: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    authFetch("/marketplace/customers/profile")
      .then((response) => response.json())
      .then((profile) => {
        setForm({
          full_name: profile.full_name || profile.fullname || "",
          phone: profile.phone || profile.user_phone || "",
          email: profile.email || profile.user_email || "",
          country: profile.country || "",
          city: profile.city || "",
          address: profile.address || "",
          photo_url: profile.photo_url || "",
        });
      })
      .catch(() => setMessage("Impossible de charger le profil client."))
      .finally(() => setLoading(false));
  }, []);

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setMessage("");
    try {
      const uploadData = new FormData();
      uploadData.append("photo", file);
      const response = await authFetch("/upload-user-photo", {
        method: "POST",
        body: uploadData,
      });
      const data = await response.json().catch(() => ({}));
      if (data.profile_image_url) {
        setForm((current) => ({ ...current, photo_url: data.profile_image_url }));
        setMessage("Photo uploadée. N'oubliez pas d'enregistrer votre profil.");
      } else {
        setMessage(data.error || "Erreur upload de la photo.");
      }
    } catch {
      setMessage("Erreur réseau pendant l'upload de la photo.");
    }
    setUploadingPhoto(false);
  };

  const initials = (form.full_name || "C")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    const response = await authFetch("/marketplace/customers/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Profil client enregistré." : data.error || "Erreur enregistrement profil.");
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "triangle_token=; path=/; max-age=0";
    router.push("/marketplace");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black">Mon profil client</h1>
          <p className="text-gray-500">Informations utilisées pour vos commandes Marketplace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/client/dashboard" className="rounded-xl bg-black px-5 py-3 font-bold text-white">Espace client</Link>
          <Link href="/marketplace" className="rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black">Marketplace</Link>
          <button onClick={logout} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Déconnexion</button>
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-4 rounded-2xl bg-white p-6 shadow">
        {message && (
          <div className="rounded-xl bg-yellow-50 p-4 font-bold text-yellow-800">{message}</div>
        )}
        {loading ? (
          <div className="rounded-xl bg-gray-100 p-4 font-bold text-gray-500">Chargement du profil...</div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              {form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt="Photo de profil"
                  className="h-20 w-20 rounded-full border-2 border-yellow-500 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--ml-navy,#0f1b3d)] text-xl font-black text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-black">Photo de profil</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadPhoto}
                  className="mt-1 w-full text-sm text-gray-600"
                />
                {uploadingPhoto && <p className="text-sm font-bold text-blue-600">Upload en cours...</p>}
              </div>
            </div>

            <input className="rounded-xl border p-4" placeholder="Nom complet" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className="rounded-xl border p-4" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="rounded-xl border p-4" placeholder="Email (optionnel)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="rounded-xl border p-4" placeholder="Pays" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <input className="rounded-xl border p-4" placeholder="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <textarea className="rounded-xl border p-4" placeholder="Adresse de livraison" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <button className="rounded-xl bg-yellow-500 py-4 font-black text-black">Enregistrer mon profil</button>
          </>
        )}
      </form>
    </main>
  );
}
