"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch, getAuthToken } from "../../lib/api";

/**
 * Le seul morceau interactif de la fiche produit.
 *
 * Il est isolé pour que tout le contenu indexable de la page reste rendu par
 * le serveur : un bouton n'a pas besoin d'entraîner le passage de la fiche
 * entière côté client.
 *
 * L'appartenance du produit se décide ici, dans le navigateur, parce qu'elle
 * dépend de l'entreprise active du visiteur — donc d'une information qui ne
 * doit surtout pas être mise en cache dans une page publique.
 */
export default function AjouterAuPanier({
  produitId, companyId, chemin, disponible,
}: {
  produitId: number;
  companyId: number | null;
  chemin: string;
  disponible: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const entrepriseActive = () => {
    if (typeof window === "undefined") return 0;
    const active = Number(localStorage.getItem("active_company_id") || 0);
    if (active) return active;
    const user = JSON.parse(
      localStorage.getItem("business_user") || localStorage.getItem("user") || "{}"
    );
    return Number(user?.company_id || 0);
  };

  const monProduit = Boolean(companyId) && entrepriseActive() === Number(companyId);

  const ajouter = async () => {
    if (monProduit) {
      setMessage("C’est votre produit. Vous pouvez le gérer dans Mes produits publiés.");
      return;
    }
    if (!getAuthToken()) {
      router.push(`/client/login?redirect=${encodeURIComponent(chemin)}`);
      return;
    }
    setEnvoi(true);
    const reponse = await authFetch("/marketplace/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketplace_product_id: produitId, quantity: 1 }),
    });
    const data = await reponse.json().catch(() => ({}));
    setEnvoi(false);
    if (reponse.status === 401 || reponse.status === 403) {
      router.push(`/client/login?redirect=${encodeURIComponent(chemin)}`);
      return;
    }
    setMessage(
      reponse.ok ? "Produit ajouté au panier." : data.error || "Impossible d’ajouter ce produit au panier."
    );
  };

  if (monProduit) {
    return (
      <Link
        href="/vendor/products"
        className="mt-6 block w-full rounded-xl bg-black py-4 text-center font-black text-white"
      >
        Gérer ce produit
      </Link>
    );
  }

  return (
    <>
      {message && (
        <p className="mt-5 rounded-xl bg-yellow-100 p-4 font-bold text-yellow-800">{message}</p>
      )}
      <button
        onClick={ajouter}
        disabled={!disponible || envoi}
        className="mt-6 w-full rounded-xl bg-yellow-500 py-4 font-black text-black disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
      >
        {!disponible ? "Indisponible" : envoi ? "Ajout en cours…" : "Ajouter au panier"}
      </button>
    </>
  );
}
