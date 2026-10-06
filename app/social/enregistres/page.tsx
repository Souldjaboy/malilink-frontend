"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../../lib/api";
import SocialNav from "../../components/SocialNav";
import FilPagine from "../../components/social/FilPagine";

/* Publications enregistrées : seules celles que je peux encore voir. */
export default function SocialEnregistresPage() {
  const [moi, setMoi] = useState<number | null>(null);
  useEffect(() => {
    authFetch("/social/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMoi(d?.profile?.user_id ?? null))
      .catch(() => {});
  }, []);
  return (
    <div className="min-h-screen bg-gray-100 pb-24 lg:pb-8">
      <SocialNav />
      <main className="mx-auto max-w-xl px-3 py-4">
        <h1 className="text-2xl font-black text-black">Publications enregistrées</h1>
        <FilPagine
          url="/social/saved"
          me={moi}
          vide={<p className="mt-4 rounded-2xl bg-white p-6 text-center text-sm font-semibold text-gray-500 shadow">Rien d&apos;enregistré pour l&apos;instant.</p>}
        />
      </main>
    </div>
  );
}
