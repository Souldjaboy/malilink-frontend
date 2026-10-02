"use client";

import Link from "next/link";
import AbonnementClient from "../../components/abonnement/AbonnementClient";

/* Paramètres → Abonnement : offre, échéance, factures et paiement. */
export default function MonAbonnementPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <p className="mx-auto mb-3 max-w-4xl text-sm text-gray-600">
        <Link href="/parametres" className="underline">Paramètres</Link> › Abonnement
      </p>
      <AbonnementClient modeVerrou={false} />
    </main>
  );
}
