"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authFetch } from "../../lib/api";
import type { Etablissement as Etab } from "../lib/education";
import Etablissement from "./Etablissement";
import AnneesPeriodes from "./AnneesPeriodes";
import { ModeleBulletin, ModeleCarte } from "./Modeles";

/* Paramètres › Éducation : l'établissement (identité saisie une fois), les
   modèles de carte et de bulletin, les années et périodes. */

type Onglet = "etablissement" | "carte" | "bulletin" | "annees";
const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "etablissement", libelle: "Établissement" },
  { id: "carte", libelle: "Carte scolaire" },
  { id: "bulletin", libelle: "Bulletin" },
  { id: "annees", libelle: "Années & périodes" },
];

export default function EducationParametresPage() {
  const [onglet, setOnglet] = useState<Onglet>("etablissement");
  const [etab, setEtab] = useState<Etab | null>(null);
  const [annees, setAnnees] = useState<{ id: number; label: string }[]>([]);
  const [refus, setRefus] = useState("");

  // Les formulaires gardent leur saisie : un rechargement ne fait que
  // rafraîchir les données (images, année active) affichées autour.
  const charger = useCallback(async () => {
    const [e, a] = await Promise.all([authFetch("/education/etablissement").catch(() => null), authFetch("/education/school-years").catch(() => null)]);
    if (e?.ok) setEtab(await e.json());
    else setRefus("Paramètres indisponibles pour votre compte.");
    if (a?.ok) setAnnees(await a.json());
  }, []);

  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get("onglet") as Onglet | null;
    if (demande && ONGLETS.some((o) => o.id === demande)) queueMicrotask(() => setOnglet(demande));
    queueMicrotask(() => charger());
  }, [charger]);

  const choisir = (o: Onglet) => {
    setOnglet(o);
    window.history.replaceState(null, "", `/education/parametres?onglet=${o}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <Link href="/education" className="text-sm font-bold text-slate-500 hover:text-slate-800">← Éducation</Link>
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Paramètres de l&apos;école</h1>
        </div>
        <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm" aria-label="Sections des paramètres">
          {ONGLETS.map((o) => (
            <button key={o.id} type="button" onClick={() => choisir(o.id)} aria-current={onglet === o.id ? "page" : undefined} data-nav-sombre
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${onglet === o.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {o.libelle}
            </button>
          ))}
        </nav>
        {refus ? (
          <p className="rounded-2xl bg-white p-6 text-center font-semibold text-slate-700">{refus}</p>
        ) : !etab ? (
          <Loader2 className="mx-auto animate-spin text-slate-400" />
        ) : onglet === "etablissement" ? (
          <Etablissement etab={etab} annees={annees} onSaved={() => charger()} onFichiers={() => charger()} />
        ) : onglet === "carte" ? (
          <ModeleCarte etab={etab} onSaved={() => charger()} />
        ) : onglet === "bulletin" ? (
          <ModeleBulletin etab={etab} onSaved={() => charger()} />
        ) : (
          <AnneesPeriodes onChange={() => charger()} />
        )}
      </div>
    </div>
  );
}
