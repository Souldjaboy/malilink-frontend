"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";
import Composer from "../../components/social/Composer";

/* Publier : le composeur en plein écran (texte, photos, vidéo, caméra). */
export default function SocialPublierPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    authFetch("/social/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {})
      .finally(() => setChargement(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        <h1 className="mb-3 text-2xl font-black text-black">Publier</h1>
        {chargement ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement...</p>
        ) : !me?.activated ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="font-bold text-gray-700">Activez d&apos;abord votre profil social pour publier.</p>
            <Link href="/social/profile/setup" className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Activer mon profil
            </Link>
          </div>
        ) : (
          <>
            <Composer
              prenom={me.profile?.display_name?.split(" ")[0] || ""}
              autoFocus
              onPublished={() => router.push("/social")}
            />
            <p className="mt-3 text-center text-xs text-gray-500">
              Texte, jusqu&apos;à 10 photos ou une vidéo de 2 minutes au plus. Choisissez qui peut voir avant de publier.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
