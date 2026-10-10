"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiUrl } from "../lib/api";
import { productConfig } from "../lib/product-config";

/* Confirmation d'un changement d'adresse email (lien reçu par la NOUVELLE
   adresse). Rien n'est modifié tant que cette page n'a pas été ouverte. */
function Confirmation() {
  const token = useSearchParams().get("token") || "";
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let actif = true;
    if (!/^[0-9a-f]{48}$/.test(token)) {
      queueMicrotask(() => setEtat({ ok: false, message: "Lien incomplet ou invalide." }));
      return;
    }
    fetch(apiUrl("/comptes/changement-email/confirmer"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (actif) setEtat({ ok: r.ok, message: d.message || d.error || (r.ok ? "Adresse confirmée." : "Confirmation impossible.") });
      })
      .catch(() => { if (actif) setEtat({ ok: false, message: "Connexion impossible. Réessayez." }); });
    return () => { actif = false; };
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
      <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{productConfig.name}</p>
      <h1 className="mt-2 text-2xl font-black text-gray-900">Confirmation de l&apos;adresse email</h1>
      {!etat ? (
        <Loader2 className="mx-auto mt-6 animate-spin text-gray-400" />
      ) : (
        <>
          {etat.ok ? <CheckCircle2 className="mx-auto mt-6 text-green-600" size={48} /> : <XCircle className="mx-auto mt-6 text-red-600" size={48} />}
          <p className={`mt-4 font-semibold ${etat.ok ? "text-green-800" : "text-red-800"}`}>{etat.message}</p>
          <Link href="/login" className="mt-6 inline-block rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">Se connecter</Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmerEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Suspense fallback={<Loader2 className="animate-spin text-gray-400" />}>
        <Confirmation />
      </Suspense>
    </main>
  );
}
