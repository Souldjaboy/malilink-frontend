"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";
import { lireMontant, MODES_PAR_DEFAUT } from "../lib/education";

const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

/* Encaissement sur l'échéancier unique d'un élève : reçu numéroté,
   répartition sur les échéances, écriture comptable (côté serveur). */
export default function Encaisser({ plan, onFait }: { plan: { id: number; total_amount: string | number; total_paid: string | number }; onFait: (message: string, recuId?: number) => void }) {
  const reste = Math.max(0, Number(plan.total_amount) - Number(plan.total_paid));
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("especes");
  const [reference, setReference] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  if (reste <= 0) return <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Échéancier soldé.</p>;
  const envoyer = async () => {
    const m = lireMontant(montant);
    if (!(m > 0)) return setErreur("Saisissez un montant.");
    if (m > reste) return setErreur(`Le reste à payer est de ${formatFCFA(reste)}.`);
    setEnvoi(true);
    setErreur("");
    const r = await authFetch(`/education/fee-plans/${plan.id}/encaissements`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ montant: m, mode, reference }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnvoi(false);
    if (!r?.ok) return setErreur(d?.error || "Paiement non enregistré.");
    setMontant("");
    setReference("");
    onFait(`Paiement de ${formatFCFA(m)} enregistré (reçu ${d.paiement.receipt_number}).`, d.paiement.id);
  };
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-black text-slate-900">Encaisser · reste {formatFCFA(reste)}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <input inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Montant (FCFA)" aria-label="Montant" className={champ} />
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Mode de paiement" className={champ}>
          {MODES_PAR_DEFAUT.map((m) => <option key={m.code} value={m.code}>{m.libelle}</option>)}
        </select>
      </div>
      {mode !== "especes" && <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence de la transaction" aria-label="Référence" className={champ} />}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMontant(String(reste))} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">Solder · {formatFCFA(reste)}</button>
      </div>
      {erreur && <p role="alert" className="text-sm font-semibold text-red-700">{erreur}</p>}
      <button type="button" onClick={envoyer} disabled={envoi}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-black text-black disabled:opacity-60">
        {envoi ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />} Enregistrer le paiement
      </button>
    </div>
  );
}

