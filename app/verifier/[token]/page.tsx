"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, BadgeCheck, Clock, Loader2, ShieldX } from "lucide-react";
import { apiUrl } from "../../lib/api";

/* Vérification publique d'une carte scolaire ou d'un bulletin (QR).
   Sans compte. N'affiche que ce qui prouve l'authenticité : aucun
   paiement, téléphone, adresse, date de naissance, note ni photo. */

type Resultat = {
  authentique: boolean;
  statut?: "valide" | "expire" | "remplace" | "revoque";
  type_libelle?: string;
  etablissement?: { nom: string; logo: string | null; couleur: string };
  eleve?: string;
  classe?: string;
  annee_scolaire?: string;
  periode?: string;
  reference?: string;
  emis_le?: string;
  valide_jusqu_au?: string | null;
  message?: string;
};

const jour = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "");

const ETATS = {
  valide: { titre: "Document authentique", detail: "Ce document a été émis par l'établissement et il est valide.", classe: "bg-emerald-600", Icone: BadgeCheck },
  expire: { titre: "Document authentique — expiré", detail: "Ce document a bien été émis par l'établissement, mais sa période de validité est terminée.", classe: "bg-amber-500", Icone: Clock },
  remplace: { titre: "Document remplacé", detail: "Ce document a été émis par l'établissement puis remplacé par un nouveau. Il n'est plus valable.", classe: "bg-red-600", Icone: AlertTriangle },
  revoque: { titre: "Document révoqué", detail: "Ce document a été émis par l'établissement puis annulé. Il n'est plus valable.", classe: "bg-red-600", Icone: ShieldX },
} as const;

export default function VerifierDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [res, setRes] = useState<Resultat | null>(null);
  const [panne, setPanne] = useState(false);

  useEffect(() => {
    let actif = true;
    fetch(apiUrl(`/verification/${encodeURIComponent(token || "")}`), { cache: "no-store" })
      .then(async (r) => {
        if (!actif) return;
        if (r.status === 429 || r.status >= 500) { setPanne(true); return; }
        setRes(await r.json().catch(() => ({ authentique: false })));
      })
      .catch(() => { if (actif) setPanne(true); });
    return () => { actif = false; };
  }, [token]);

  const etat = res?.authentique && res.statut ? ETATS[res.statut] : null;

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lg">
        {!res && !panne && (
          <div className="flex flex-col items-center gap-3 p-10 text-slate-500"><Loader2 className="animate-spin" /> Vérification en cours…</div>
        )}
        {panne && (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto text-amber-500" size={40} aria-hidden="true" />
            <p className="mt-3 font-bold text-slate-900">Vérification momentanément indisponible</p>
            <p className="mt-1 text-sm text-slate-500">Réessayez dans quelques instants.</p>
          </div>
        )}
        {res && !res.authentique && (
          <div>
            <div className="flex flex-col items-center gap-2 bg-red-600 px-6 py-8 text-center text-white">
              <ShieldX size={44} aria-hidden="true" />
              <h1 className="text-xl font-black text-white">Document non reconnu</h1>
            </div>
            <p className="p-6 text-center text-sm text-slate-600">
              Ce code ne correspond à aucun document émis par un établissement utilisant MaliLink Éducation. Le document présenté peut être falsifié.
            </p>
          </div>
        )}
        {res && etat && (
          <div>
            <div className={`flex flex-col items-center gap-2 px-6 py-7 text-center text-white ${etat.classe}`}>
              <etat.Icone size={44} aria-hidden="true" />
              <h1 className="text-xl font-black text-white">{etat.titre}</h1>
              <p className="text-sm text-white/90">{etat.detail}</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                {res.etablissement?.logo ? (
                  <img src={apiUrl(res.etablissement.logo)} alt="" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <span className="h-12 w-12 rounded-lg" style={{ background: res.etablissement?.couleur || "#0f1b3d" }} />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Établissement</p>
                  <p className="font-black text-slate-900">{res.etablissement?.nom}</p>
                </div>
              </div>
              <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {([
                  ["Type de document", res.type_libelle],
                  ["Élève", res.eleve],
                  ["Classe", res.classe],
                  ["Année scolaire", res.annee_scolaire],
                  ["Période", res.periode],
                  ["Référence", res.reference],
                  ["Émis le", jour(res.emis_le)],
                  ["Valable jusqu'au", jour(res.valide_jusqu_au)],
                  ["Statut", res.statut === "valide" ? "Valide" : res.statut === "expire" ? "Expiré" : res.statut === "remplace" ? "Remplacé" : "Révoqué"],
                ] as const).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-bold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-center text-xs text-slate-400">
                Seules les informations nécessaires à l&apos;authentification sont affichées. Vérification fournie par MaliLink Éducation.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
