"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { apiUrl } from "../../lib/api";

/* Page publique de vérification d'un badge (scan du QR).
   N'affiche QUE les informations autorisées par le backend :
   identité, photo, rôle, entreprise, type, validité, statut. */

const STATUS_VIEW: Record<string, { label: string; color: string; icon: any }> = {
  actif: { label: "BADGE VALIDE", color: "#15803d", icon: BadgeCheck },
  expire: { label: "BADGE EXPIRÉ", color: "#c2410c", icon: ShieldAlert },
  suspendu: { label: "BADGE SUSPENDU", color: "#b45309", icon: ShieldAlert },
  perdu: { label: "BADGE DÉCLARÉ PERDU", color: "#b91c1c", icon: ShieldX },
  remplace: { label: "BADGE REMPLACÉ", color: "#6b7280", icon: ShieldX },
  revoque: { label: "BADGE RÉVOQUÉ", color: "#b91c1c", icon: ShieldX },
};

export default function BadgeVerifyPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.token) return;
    fetch(apiUrl(`/badges/public/verify/${params.token}`))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) setError(payload?.error || "Badge introuvable.");
        else setData(payload);
      })
      .catch(() => setError("Erreur réseau. Réessayez."))
      .finally(() => setLoading(false));
  }, [params?.token]);

  const view = data ? STATUS_VIEW[data.status] || STATUS_VIEW.revoque : null;
  const Icon = view?.icon || ShieldX;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ml-navy,#0f1b3d)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <img
            src="/brands/malilink-logo-officiel.jpg"
            alt="MaliLink Global"
            className="h-10 w-10 rounded-xl object-cover"
          />
          <p className="font-black text-white">
            Vérification de badge <span className="text-[var(--ml-gold,#d4a23c)]">MaliLink</span>
          </p>
        </div>

        {loading ? (
          <p className="rounded-2xl bg-white p-8 text-center font-semibold text-gray-500">
            Vérification en cours...
          </p>
        ) : error ? (
          <div className="rounded-2xl bg-white p-8 text-center">
            <ShieldX className="mx-auto text-red-600" size={40} />
            <p className="mt-3 font-black text-red-700">{error}</p>
            <p className="mt-1 text-sm text-gray-500">
              Ce badge n&apos;existe pas ou son QR n&apos;est plus valide.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white">
            <div
              className="flex items-center justify-center gap-2 py-3 font-black text-white"
              style={{ backgroundColor: view?.color }}
            >
              <Icon size={22} /> {view?.label}
            </div>
            <div className="flex items-center gap-4 p-5">
              {data.photo_url ? (
                <img
                  src={data.photo_url}
                  alt=""
                  className="h-20 w-20 rounded-xl border-2 object-cover"
                  style={{ borderColor: view?.color }}
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--ml-navy,#0f1b3d)] text-2xl font-black text-white">
                  {(data.fullname || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-black">{data.fullname}</p>
                <p className="truncate text-sm font-bold text-gray-600">{data.role}</p>
                <p className="truncate text-sm text-gray-500">{data.company_name}</p>
                <p className="mt-1 font-mono text-xs font-bold text-gray-500">{data.matricule}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
              <p className="font-black text-gray-700">{data.badge_label}</p>
              {data.department && <p>Département : {data.department}</p>}
              {data.valid_until && (
                <p>Valide jusqu&apos;au {new Date(data.valid_until).toLocaleDateString("fr-FR")}</p>
              )}
              <p className="mt-1 text-gray-400">
                Informations fournies et vérifiées par le serveur MaliLink.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
