"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, authHeaders, getAuthToken } from "../lib/api";

/* Bouton « Demander / Réserver » : envoie une demande client à
   l'entreprise (notification côté entreprise). Si le visiteur n'a pas
   de compte, il est dirigé vers l'inscription client. */
export default function BusinessRequestButton({
  companyId,
  module,
  itemId,
  itemLabel,
  requestType,
  label,
  className = "",
}: {
  companyId: number;
  module: "automobile" | "immobilier" | "hotel" | "restaurant";
  itemId?: number;
  itemLabel: string;
  requestType: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  const send = async () => {
    if (!getAuthToken()) {
      router.push("/client/register");
      return;
    }
    setStatus("loading");
    setFeedback("");
    try {
      const response = await fetch(apiUrl("/public/business-requests"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          company_id: companyId,
          module,
          item_id: itemId,
          item_label: itemLabel,
          request_type: requestType,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/client/login");
          return;
        }
        setStatus("error");
        setFeedback(data?.error || "Erreur envoi de la demande. Réessayez.");
        return;
      }
      setStatus("sent");
      setFeedback(data?.message || "Votre demande a été envoyée.");
    } catch {
      setStatus("error");
      setFeedback("Erreur réseau. Réessayez.");
    }
  };

  if (status === "sent") {
    return <p className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{feedback}</p>;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={send}
        disabled={status === "loading"}
        className="w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-black disabled:opacity-60"
      >
        {status === "loading" ? "Envoi..." : label}
      </button>
      {status === "error" && (
        <p className="mt-2 text-sm font-semibold text-red-600">{feedback}</p>
      )}
    </div>
  );
}
