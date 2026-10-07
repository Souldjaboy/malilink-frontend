"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, LayoutGrid, Loader2, RefreshCw, Settings } from "lucide-react";
import { authFetch } from "../../lib/api";
import { dateFr, ouvrirDocument, useApercuSvg } from "../lib/education";

/* Carte scolaire d'un élève : aperçu recto-verso du modèle choisi par
   l'école, PDF (format carte ou planche A4), régénération (perte, vol).
   Le QR mène à la page publique de vérification et sert au pointage. */

type Carte = {
  reference: string; statut: string; annee: string; classe: string; valid_until: string | null;
  issued_at: string; verification_url: string;
};

function Face({ chemin, alt, portrait }: { chemin: string; alt: string; portrait: boolean }) {
  const { url, erreur } = useApercuSvg(chemin, 0);
  return (
    <div className="overflow-hidden rounded-xl bg-slate-100 shadow ring-1 ring-slate-200" style={{ aspectRatio: portrait ? "153 / 243" : "243 / 153" }}>
      {url ? <img src={url} alt={alt} className="h-full w-full" /> : erreur
        ? <p className="flex h-full items-center justify-center text-xs text-slate-500">Aperçu indisponible</p>
        : <Loader2 className="m-auto mt-10 animate-spin text-slate-400" aria-hidden="true" />}
    </div>
  );
}

export default function CarteEleve({ eleveId, archive, gestion }: { eleveId: number; archive: boolean; gestion: boolean }) {
  const [carte, setCarte] = useState<Carte | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const [c, e] = await Promise.all([
      authFetch(`/education/students/${eleveId}/carte`).catch(() => null),
      authFetch("/education/etablissement").catch(() => null),
    ]);
    if (c?.ok) setCarte((await c.json()).carte);
    if (e?.ok) setPortrait((await e.json()).card_options?.orientation === "portrait");
  }, [eleveId]);
  useEffect(() => { queueMicrotask(charger); }, [charger]);

  const regenerer = async () => {
    if (!window.confirm("Émettre une nouvelle carte ? L'ancienne sera marquée « remplacée » et son QR ne sera plus valable.")) return;
    setEnvoi(true);
    const r = await authFetch(`/education/students/${eleveId}/carte/regenerer`, { method: "POST" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnvoi(false);
    if (!r?.ok) return setMessage(d?.error || "Impossible d'émettre une nouvelle carte.");
    setCarte(d.carte);
    setVersion((v) => v + 1);
    setMessage(`Nouvelle carte ${d.carte.reference} émise. Imprimez-la et récupérez l'ancienne.`);
  };

  const doc = async (format: "carte" | "planche") => {
    const e = await ouvrirDocument(`/education/students/${eleveId}/carte/pdf${format === "planche" ? "?format=planche" : ""}`, `carte-${carte?.reference || eleveId}.pdf`);
    if (e) setMessage(e);
  };

  if (archive && !carte) {
    return <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">Dossier archivé : la carte a été révoquée. Restaurez le dossier pour en émettre une nouvelle.</p>;
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4">
      <div className={`grid gap-3 ${portrait ? "grid-cols-2" : ""}`}>
        <Face chemin={`/education/students/${eleveId}/carte/apercu?face=recto&v=${version}`} alt="Carte scolaire, recto" portrait={portrait} />
        <Face chemin={`/education/students/${eleveId}/carte/apercu?face=verso&v=${version}`} alt="Carte scolaire, verso" portrait={portrait} />
      </div>
      {carte && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">N° de carte</dt><dd className="font-mono font-bold text-slate-900">{carte.reference}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Statut</dt><dd className="font-bold text-emerald-700">{carte.statut === "valide" ? "Valide" : carte.statut}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Année</dt><dd className="font-bold text-slate-900">{carte.annee}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Valable jusqu&apos;au</dt><dd className="font-bold text-slate-900">{dateFr(carte.valid_until)}</dd></div>
        </dl>
      )}
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => doc("carte")} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">
          <FileText size={16} aria-hidden="true" /> Carte PDF
        </button>
        <button type="button" onClick={() => doc("planche")} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
          <LayoutGrid size={16} aria-hidden="true" /> Planche A4
        </button>
        {gestion && !archive && (
          <button type="button" onClick={regenerer} disabled={envoi} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-red-700 ring-1 ring-slate-200 disabled:opacity-60">
            <RefreshCw size={16} aria-hidden="true" /> Régénérer
          </button>
        )}
        {carte && (
          <a href={carte.verification_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
            <ExternalLink size={16} aria-hidden="true" /> Page de vérification
          </a>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Le QR ne contient qu&apos;un lien de vérification (aucune donnée personnelle) ; il sert aussi au pointage des présences.
        {gestion && <> Modèle et options : <Link href="/education/parametres?onglet=carte" className="inline-flex items-center gap-0.5 font-bold text-amber-700 underline"><Settings size={12} />Paramètres</Link>.</>}
      </p>
    </section>
  );
}
