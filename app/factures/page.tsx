"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../lib/api";
import { formatFCFA } from "../lib/format";
import ImportButton from "../components/ImportButton";

type Facture = {
  id: number; numero: string | null; reference: string | null; invoice_date: string | null; site: string | null;
  description: string | null; invoiced_amount: string; paid_amount: string; remaining_amount: string;
  payment_date: string | null; status: string; observations: string | null;
};
type Totals = { inv: string; paid: string; rem: string; paye: string; partiel: string; impaye: string };

const STATUS = { paye: { label: "Payé", c: "bg-green-100 text-green-800" }, partiel: { label: "Partiel", c: "bg-amber-100 text-amber-800" }, impaye: { label: "Impayé", c: "bg-red-100 text-red-800" } } as Record<string, { label: string; c: string }>;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—");

export default function FacturesPage() {
  const [items, setItems] = useState<Facture[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const q = status ? `?status=${status}` : "";
    const res = await authFetch(`/factures${q}`);
    if (res.ok) { const d = await res.json(); setItems(d.factures); setTotals(d.totals); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-gray-900">Factures</h1>
          <div className="flex gap-2">
            <ImportButton profile="auto" label="Importer des factures" />
            <Link href="/dashboard" className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-700">← Tableau de bord</Link>
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card label="Facturé" value={formatFCFA(Number(totals.inv))} />
            <Card label="Payé" value={formatFCFA(Number(totals.paid))} c="text-green-700" />
            <Card label="Reste" value={formatFCFA(Number(totals.rem))} c="text-red-600" />
            <Card label="Payées" value={totals.paye} />
            <Card label="Partielles" value={totals.partiel} />
            <Card label="Impayées" value={totals.impaye} />
          </div>
        )}

        <div className="flex gap-2">
          <select className="rounded-xl border border-gray-300 p-2 text-gray-900" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="paye">Payées</option>
            <option value="partiel">Partielles</option>
            <option value="impaye">Impayées</option>
          </select>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow">
          {items.length === 0 ? (
            <p className="p-4 text-gray-600">Aucune facture. Importez vos états Excel ou créez-en une.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead><tr className="text-left text-gray-500"><th className="p-2">Réf.</th><th className="p-2">Date</th><th className="p-2">Site</th><th className="p-2">Description</th><th className="p-2">Facturé</th><th className="p-2">Payé</th><th className="p-2">Reste</th><th className="p-2">Statut</th></tr></thead>
                <tbody>
                  {items.map((f) => (
                    <tr key={f.id} className="border-t border-gray-100">
                      <td className="p-2 font-mono text-xs text-gray-900">{f.reference || "—"}</td>
                      <td className="p-2 text-gray-600">{fmtDate(f.invoice_date)}</td>
                      <td className="p-2 text-gray-600">{f.site || "—"}</td>
                      <td className="p-2 text-gray-700">{f.description || "—"}</td>
                      <td className="p-2 text-gray-700">{formatFCFA(Number(f.invoiced_amount))}</td>
                      <td className="p-2 text-gray-700">{formatFCFA(Number(f.paid_amount))}</td>
                      <td className="p-2 font-semibold text-gray-900">{formatFCFA(Number(f.remaining_amount))}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[f.status]?.c || "bg-gray-200"}`}>{STATUS[f.status]?.label || f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({ label, value, c }: { label: string; value: string; c?: string }) {
  return <div className="rounded-xl bg-white p-3 text-center shadow"><p className={`text-lg font-black ${c || "text-gray-900"}`}>{value}</p><p className="text-xs text-gray-500">{label}</p></div>;
}
