"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { authFetch, getAuthToken } from "../lib/api";
import SocialNav from "../components/SocialNav";
import Composer from "../components/social/Composer";
import FilPagine, { type FilPagineHandle } from "../components/social/FilPagine";

export default function SocialHomePage() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [portee, setPortee] = useState<"tout" | "reseau">("tout");
  const fil = useRef<FilPagineHandle>(null);

  useEffect(() => {
    if (!getAuthToken()) {
      queueMicrotask(() => {
        setLoggedOut(true);
        setLoading(false);
      });
      return;
    }
    authFetch("/social/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setMe(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement...</p>
        ) : loggedOut ? (
          <div className="mt-8 rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-8 text-center text-white shadow">
            <Sparkles className="mx-auto text-[var(--ml-gold,#d4a23c)]" size={36} />
            <h1 className="mt-3 text-2xl font-black text-white">Bienvenue sur MaliLink Social</h1>
            <p className="mt-2 text-white/80">
              La communauté MaliLink : échanges, amis et réseau professionnel.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/client/register" className="rounded-xl bg-yellow-500 px-6 py-3.5 font-black text-black">
                Créer un compte MaliLink
              </Link>
              <Link href="/login" className="rounded-xl border border-white/25 px-6 py-3.5 font-bold text-white">
                J&apos;ai déjà un compte — Connexion
              </Link>
            </div>
          </div>
        ) : !me?.activated ? (
          <div className="mt-8 rounded-3xl bg-[var(--ml-navy,#0f1b3d)] p-8 text-center text-white shadow">
            <Sparkles className="mx-auto text-[var(--ml-gold,#d4a23c)]" size={36} />
            <h1 className="mt-3 text-2xl font-black text-white">Activez votre profil social</h1>
            <p className="mt-2 text-white/80">
              Vous avez déjà un compte MaliLink : il suffit d&apos;activer votre espace social.
              Pas de nouveau compte à créer.
            </p>
            <Link
              href="/social/profile/setup"
              className="mt-5 inline-block rounded-xl bg-yellow-500 px-8 py-3.5 font-black text-black"
            >
              Activer mon profil social
            </Link>
          </div>
        ) : (
          <>
            <h1 className="sr-only">Fil d&apos;actualité</h1>
            <Composer
              prenom={me.profile?.display_name?.split(" ")[0] || ""}
              onPublished={(post) => fil.current?.ajouterEnTete(post)}
            />

            <div className="mt-4 flex rounded-2xl bg-white p-1 shadow" role="tablist" aria-label="Contenu du fil">
              {([["tout", "Pour vous"], ["reseau", "Mon réseau"]] as const).map(([cle, libelle]) => (
                <button
                  key={cle}
                  type="button"
                  role="tab"
                  aria-selected={portee === cle}
                  onClick={() => setPortee(cle)}
                  className={`flex-1 rounded-xl py-2 text-sm font-black ${portee === cle ? "bg-[var(--ml-navy,#0f1b3d)] text-white" : "text-gray-600"}`}
                >
                  {libelle}
                </button>
              ))}
            </div>

            <FilPagine
              ref={fil}
              url={`/social/feed?scope=${portee}`}
              me={me.profile?.user_id ?? null}
              vide={
                <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow">
                  <p className="font-bold text-gray-700">
                    {portee === "reseau" ? "Personne de votre réseau n'a encore publié." : "Votre fil est encore calme."}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Trouvez des personnes à suivre pour remplir votre fil.</p>
                  <Link href="/social/reseau?onglet=suggestions" className="mt-4 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
                    Voir des suggestions
                  </Link>
                </div>
              }
            />
          </>
        )}
      </main>
    </div>
  );
}
