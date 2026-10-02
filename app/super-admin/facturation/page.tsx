"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/biometrie";
import { formatFCFA } from "../../lib/format";

/**
 * SUPER-ADMIN → FACTURATION : paiements déclarés à valider (toutes
 * entreprises) et moyens de paiement publiés aux clients. Aucun numéro
 * n'est prérempli : un moyen sans numéro n'est pas affiché.
 */

type Moyen = { code: string; label: string; account_number: string; account_name: string; instructions: string; qr_payload: string; enabled: boolean };

export default function FacturationPlateformePage() {
  const [attente, setAttente] = useState<any[]>([]);
  const [moyens, setMoyens] = useState<Moyen[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    const [a, m] = await Promise.all([api("/super-admin/billing/pending-payments"), api("/super-admin/billing/payment-methods")]);
    if (a.ok) setAttente(a.data.paiements || []);
    if (m.ok) setMoyens(m.data.moyens || []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const action = async (fn: () => Promise<string>) => {
    setMessage(null);
    try {
      setMessage({ ok: true, texte: await fn() });
      await charger();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Action impossible." });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm text-gray-600"><Link href="/super-admin" className="underline">Super Admin</Link> › Facturation</p>
          <h1 className="text-3xl font-black md:text-4xl">Facturation de la plateforme</h1>
        </div>
        {message && <p role={message.ok ? "status" : "alert"} className={`rounded-xl p-4 font-bold ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{message.texte}</p>}

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-black">Paiements déclarés à valider</h2>
          <p className="mt-1 text-sm text-gray-600">Vérifiez chaque référence chez l&apos;opérateur avant de valider : la validation rouvre l&apos;accès du client.</p>
          <ul className="mt-3 divide-y">
            {attente.length === 0 && <li className="py-3 text-gray-500">Aucun paiement en attente.</li>}
            {attente.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{p.company_name} — {formatFCFA(Number(p.amount))}</p>
                  <p className="text-sm text-gray-600">{p.method} · réf. <span className="font-mono">{p.transaction_reference}</span>
                    {p.invoice_number ? ` · ${p.invoice_number}` : " · mensualité"} · {new Date(p.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/super-admin/entreprises/${p.company_id}/facturation`} className="rounded-lg border px-3 py-2 font-bold">Ouvrir</Link>
                  <button type="button" className="rounded-lg border px-3 py-2 font-bold text-green-800" onClick={() => action(async () => {
                    const r = await api(`/super-admin/companies/${p.company_id}/payments/${p.id}/confirm`, { method: "POST", body: "{}" });
                    if (!r.ok) throw new Error(r.data?.error);
                    return `Paiement de ${p.company_name} validé.`;
                  })}>Valider</button>
                  <button type="button" className="rounded-lg border px-3 py-2 font-bold text-red-700" onClick={() => {
                    const reason = window.prompt("Motif du refus :");
                    if (!reason) return;
                    action(async () => {
                      const r = await api(`/super-admin/companies/${p.company_id}/payments/${p.id}/refuse`, { method: "POST", body: JSON.stringify({ reason }) });
                      if (!r.ok) throw new Error(r.data?.error);
                      return "Paiement refusé.";
                    });
                  }}>Refuser</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-black">Moyens de paiement publiés</h2>
          <div className="mt-3 space-y-3">
            {moyens.map((m) => <LigneMoyen key={m.code} moyen={m} onEnregistrer={(corps) => action(async () => {
              const r = await api(`/super-admin/billing/payment-methods/${m.code}`, { method: "PUT", body: JSON.stringify(corps) });
              if (!r.ok) throw new Error(r.data?.error);
              return `${m.label} enregistré.`;
            })} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function LigneMoyen({ moyen, onEnregistrer }: { moyen: Moyen; onEnregistrer: (c: Partial<Moyen>) => void }) {
  const [m, setM] = useState(moyen);
  return (
    <form className="grid gap-2 rounded-xl border p-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); onEnregistrer(m); }}>
      <p className="font-bold md:col-span-6">{moyen.label}</p>
      <input className="rounded-lg border p-2 md:col-span-2" placeholder="Numéro / compte" value={m.account_number} onChange={(e) => setM({ ...m, account_number: e.target.value })} aria-label="Numéro" />
      <input className="rounded-lg border p-2 md:col-span-2" placeholder="Titulaire" value={m.account_name} onChange={(e) => setM({ ...m, account_name: e.target.value })} aria-label="Titulaire" />
      <input className="rounded-lg border p-2 md:col-span-2" placeholder="Texte du QR (facultatif)" value={m.qr_payload} onChange={(e) => setM({ ...m, qr_payload: e.target.value })} aria-label="QR" />
      <input className="rounded-lg border p-2 md:col-span-4" placeholder="Instructions" value={m.instructions} onChange={(e) => setM({ ...m, instructions: e.target.value })} aria-label="Instructions" />
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={m.enabled} onChange={(e) => setM({ ...m, enabled: e.target.checked })} /> Publié</label>
      <button type="submit" className="rounded-lg bg-[var(--ml-blue-deep,#0a1330)] px-3 py-2 font-bold text-white">Enregistrer</button>
    </form>
  );
}
