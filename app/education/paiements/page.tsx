"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, ChevronDown, Loader2, Receipt, Search, UserPlus, Wallet } from "lucide-react";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";
import Encaisser from "../components/Encaisser";
import { dateFr, ouvrirDocument, type Classe } from "../lib/education";

/* Frais & paiements : un seul écran pour suivre et encaisser la scolarité.
   Chaque montant vient de l'échéancier unique créé à l'inscription ; chaque
   encaissement produit un reçu et une écriture comptable. */

type Tableau = {
  encaisse_aujourdhui: number; paiements_aujourdhui: number; impayes: number; eleves_en_retard: number;
  echeances_30_jours: number; nombre_echeances_30_jours: number; reste_a_encaisser: number;
  par_classe: { id: number; name: string; du: number; encaisse: number; reste: number }[];
};
type Situation = {
  id: number; matricule: string; first_name: string; last_name: string; class_name: string | null; guardian_phone: string;
  plan_id: number; label: string; total_amount: number; paye: number; reste: number; en_retard: number; prochaine_echeance: string | null;
};
type AncienFrais = { id: number; label: string; amount: string; class_name: string | null; due_date: string | null };

const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

function Carte({ titre, valeur, detail, ton, icone: Icone }: { titre: string; valeur: string; detail: string; ton: string; icone: typeof Wallet }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className={`mb-2 inline-flex rounded-xl p-2 ${ton}`}><Icone size={18} aria-hidden="true" /></div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titre}</p>
      <p className="text-xl font-black text-slate-900">{valeur}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function FraisPaiementsPage() {
  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [anciens, setAnciens] = useState<AncienFrais[]>([]);
  const [classe, setClasse] = useState("");
  const [recherche, setRecherche] = useState("");
  const [enRetard, setEnRetard] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [message, setMessage] = useState<{ texte: string; recu?: number } | null>(null);
  const [refus, setRefus] = useState("");
  const [chargement, setChargement] = useState(true);

  const chargerTableau = useCallback(async () => {
    const r = await authFetch("/education/finances/tableau-de-bord").catch(() => null);
    if (r?.ok) setTableau(await r.json());
    else if (r?.status === 403) setRefus("Le suivi des paiements est réservé à la direction, au secrétariat et à la comptabilité.");
  }, []);

  const chargerSituations = useCallback(async () => {
    const p = new URLSearchParams();
    if (classe) p.set("class_id", classe);
    if (recherche.trim()) p.set("q", recherche.trim());
    const r = await authFetch(`/education/finances/eleves?${p}`).catch(() => null);
    if (r?.ok) setSituations(await r.json());
    setChargement(false);
  }, [classe, recherche]);

  useEffect(() => {
    queueMicrotask(chargerTableau);
    authFetch("/education/classes").then(async (r) => { if (r.ok) setClasses(await r.json()); }).catch(() => {});
    authFetch("/education/fees").then(async (r) => { if (r.ok) setAnciens(await r.json()); }).catch(() => {});
  }, [chargerTableau]);

  useEffect(() => {
    const t = setTimeout(chargerSituations, recherche ? 250 : 0);
    return () => clearTimeout(t);
  }, [chargerSituations, recherche]);

  const visibles = enRetard ? situations.filter((s) => s.en_retard > 0) : situations;

  if (refus) {
    return <div className="min-h-screen bg-slate-100 p-4"><p className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-6 text-center font-semibold text-slate-700">{refus}</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/education" className="text-sm font-bold text-slate-500 hover:text-slate-800">← Éducation</Link>
            <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Frais & paiements</h1>
          </div>
          <Link href="/education/inscriptions" className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white">
            <UserPlus size={18} aria-hidden="true" /> Inscription
          </Link>
        </div>

        {tableau && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Carte titre="Encaissé aujourd'hui" valeur={formatFCFA(tableau.encaisse_aujourdhui)} detail={`${tableau.paiements_aujourdhui} paiement(s)`} ton="bg-emerald-100 text-emerald-700" icone={Wallet} />
            <Carte titre="Impayés (en retard)" valeur={formatFCFA(tableau.impayes)} detail={`${tableau.eleves_en_retard} élève(s)`} ton="bg-red-100 text-red-700" icone={AlertTriangle} />
            <Carte titre="Échéances à 30 jours" valeur={formatFCFA(tableau.echeances_30_jours)} detail={`${tableau.nombre_echeances_30_jours} échéance(s)`} ton="bg-amber-100 text-amber-700" icone={CalendarClock} />
            <Carte titre="Reste à encaisser" valeur={formatFCFA(tableau.reste_a_encaisser)} detail="sur l'année" ton="bg-slate-100 text-slate-700" icone={Receipt} />
          </div>
        )}

        {message && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <span>{message.texte}</span>
            {message.recu && (
              <button type="button" onClick={() => ouvrirDocument(`/education/fee-payments/${message.recu}/receipt`, "recu.pdf")}
                className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-bold text-emerald-800 ring-1 ring-emerald-200"><Receipt size={15} /> Imprimer le reçu</button>
            )}
          </div>
        )}

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-black text-slate-900">Situation par élève</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
            <label className="relative">
              <span className="sr-only">Rechercher</span>
              <Search size={18} className="absolute left-3 top-3 text-slate-400" aria-hidden="true" />
              <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom ou matricule" className={`${champ} pl-10`} />
            </label>
            <select value={classe} onChange={(e) => setClasse(e.target.value)} aria-label="Classe" className={champ}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={enRetard} onChange={(e) => setEnRetard(e.target.checked)} className="h-4 w-4 accent-red-600" /> En retard
            </label>
          </div>
          {chargement ? <Loader2 className="mx-auto animate-spin text-slate-400" /> : visibles.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{situations.length ? "Aucun élève en retard de paiement." : "Aucun échéancier : les frais sont créés à l'inscription."}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibles.map((s) => {
                const pct = s.total_amount > 0 ? Math.min(100, Math.round((s.paye / s.total_amount) * 100)) : 100;
                const ouvre = ouvert === s.plan_id;
                return (
                  <li key={s.plan_id} className="py-2">
                    <button type="button" onClick={() => setOuvert(ouvre ? null : s.plan_id)} aria-expanded={ouvre}
                      className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-bold text-slate-900">{s.last_name.toUpperCase()} {s.first_name}</span>
                          {s.en_retard > 0 && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700">Retard {formatFCFA(s.en_retard)}</span>}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          <span className="font-mono">{s.matricule}</span> · {s.class_name || "—"}
                          {s.prochaine_echeance ? ` · prochaine échéance ${dateFr(s.prochaine_echeance)}` : " · soldé"}
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <span className={`block h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : s.en_retard > 0 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-black tabular-nums text-slate-900">{formatFCFA(s.reste)}</span>
                        <span className="block text-[11px] text-slate-500">reste sur {formatFCFA(s.total_amount)}</span>
                      </span>
                      <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${ouvre ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    {ouvre && (
                      <div className="mt-2 space-y-2 pl-1">
                        <Encaisser plan={{ id: s.plan_id, total_amount: s.total_amount, total_paid: s.paye }}
                          onFait={(texte, recu) => { setMessage({ texte: `${s.first_name} ${s.last_name} : ${texte}`, recu }); setOuvert(null); chargerSituations(); chargerTableau(); }} />
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Link href={`/education/eleves?eleve=${s.id}`} className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-700">Dossier, reçus et échéances</Link>
                          {s.guardian_phone && <a href={`tel:${s.guardian_phone.replace(/\s/g, "")}`} className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-700">Appeler le tuteur</a>}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {tableau && tableau.par_classe.some((c) => c.du > 0) && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-black text-slate-900">Par classe</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-2">Classe</th><th className="py-2 text-right">Dû</th><th className="py-2 text-right">Encaissé</th><th className="py-2 text-right">Reste</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {tableau.par_classe.filter((c) => c.du > 0).map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 font-bold text-slate-900">{c.name}</td>
                      <td className="py-2 text-right tabular-nums">{formatFCFA(c.du)}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-700">{formatFCFA(c.encaisse)}</td>
                      <td className="py-2 text-right font-bold tabular-nums text-amber-700">{formatFCFA(c.reste)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {anciens.length > 0 && (
          <details className="rounded-2xl bg-white p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-bold text-slate-700">Anciens frais ({anciens.length}) — saisis avant le parcours d&apos;inscription unique</summary>
            <p className="mt-2 text-slate-500">Conservés en lecture. Les paiements déjà enregistrés restent dans le dossier de chaque élève et dans les encaissements du jour.</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {anciens.map((f) => (
                <li key={f.id} className="flex justify-between gap-3 py-2"><span>{f.label}{f.class_name ? ` · ${f.class_name}` : ""}</span><span className="tabular-nums">{formatFCFA(f.amount)}</span></li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
