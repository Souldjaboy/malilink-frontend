"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getAuthToken } from "../../lib/api";
import SocialNav from "../../components/SocialNav";

/* Profil : ouvre MA fiche (publications, abonnés, amis), ou l'activation. */
export default function SocialMonProfilPage() {
  const router = useRouter();
  const [etat, setEtat] = useState<"chargement" | "inactif" | "deconnecte">("chargement");

  useEffect(() => {
    if (!getAuthToken()) {
      queueMicrotask(() => setEtat("deconnecte"));
      return;
    }
    authFetch("/social/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.activated && data.profile?.user_id) router.replace(`/social/profile/${data.profile.user_id}`);
        else setEtat("inactif");
      })
      .catch(() => setEtat("inactif"));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-6">
        {etat === "chargement" ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement du profil...</p>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center shadow">
            <p className="font-bold text-gray-700">
              {etat === "deconnecte" ? "Connectez-vous pour voir votre profil." : "Votre profil social n'est pas encore activé."}
            </p>
            <Link href={etat === "deconnecte" ? "/login" : "/social/profile/setup"}
              className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              {etat === "deconnecte" ? "Connexion" : "Activer mon profil"}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
