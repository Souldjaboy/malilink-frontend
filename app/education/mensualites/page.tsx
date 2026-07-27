"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type Student = { id: number; first_name: string; last_name: string; matricule: string };
type Named = { id: number; name: string };
type Year = { id: number; label: string };
type Installment = { id: number; seq: number; label: string; due_date: string | null; amount: string; amount_paid: string; status: string };
type FeePayment = { id: number; receipt_number: string | null; amount: string; method: string; reference: string; status: string; created_at: string; recorded_by_name: string };
type Plan = {
  id: number; label: string; first_name: string; last_name: string; student_matricule: string;
  class_name: string | null; total_amount: string; installments_count: number; currency: string; status: string; total_paid: string;
  installments?: Installment[]; payments?: FeePayment[];
};

const input = "w-full rounded-xl border border-gray-300 p-3 text-gray-900";
const label = "mb-1 block text-sm font-semibold text-gray-700";
const STATUS_FR: Record<string, string> = { active: "En cours", completed: "Soldé", cancelled: "Annulé", pending: "À payer", partial: "Partiel", paid: "Payé" };
const STATUS_COLOR: Record<string, string> = { completed: "bg-green-100 text-green-800", paid: "bg-green-100 text-green-800", active: "bg-amber-100 text-amber-800", partial: "bg-amber-100 text-amber-800", pending: "bg-gray-200 text-gray-700", cancelled: "bg-red-100 text-red-800" };
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—");
const num = (v: string) => Number(v).toLocaleString("fr-FR");

export default function EducationFeePlansPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Named[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [items, setItems] = useState<Plan[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ student_id: "", school_year_id: "", class_id: "", label: "Scolarité", total_amount: "", installments_count: "9", first_due_date: "" });
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "especes", reference: "" });
  const [payMsg, setPayMsg] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(async () => {
    const res = await authFetch("/education/fee-plans");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    authFetch("/education/students").then(async (r) => r.ok && setStudents(await r.json()));
    authFetch("/education/classes").then(async (r) => r.ok && setClasses(await r.json()));
    authFetch("/education/school-years").then(async (r) => r.ok && setYears(await r.json()));
    load();
  }, [load]);

  const create = async () => {
    setMsg("");
    if (!form.student_id) return setMsg("Sélectionnez un élève.");
    if (!(Number(form.total_amount) > 0)) return setMsg("Montant total invalide.");
    setSaving(true);
    const res = await authFetch("/education/fee-plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: Number(form.student_id), school_year_id: form.school_year_id ? Number(form.school_year_id) : null,
        class_id: form.class_id ? Number(form.class_id) : null, label: form.label || "Scolarité",
        total_amount: Number(form.total_amount), installments_count: Number(form.installments_count || 1),
        first_due_date: form.first_due_date || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(data?.error || "Erreur.");
    setMsg(`✅ Plan créé (${form.installments_count} mensualités).`);
    setForm({ student_id: "", school_year_id: "", class_id: "", label: "Scolarité", total_amount: "", installments_count: "9", first_due_date: "" });
    await load();
  };

  const downloadBlob = async (path: string, filename: string) => {
    const res = await authFetch(path);
    if (!res.ok) { setMsg("Erreur téléchargement du document."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const openPlan = async (p: Plan) => {
    setPayMsg(""); setPayForm({ amount: "", method: "especes", reference: "" });
    const res = await authFetch(`/education/fee-plans/${p.id}`);
    if (res.ok) setSelected(await res.json());
  };

  const refreshSelected = async (id: number) => {
    const res = await authFetch(`/education/fee-plans/${id}`);
    if (res.ok) setSelected(await res.json());
    await load();
  };

  const addPayment = async () => {
    if (!selected) return;
    setPayMsg("");
    if (!(Number(payForm.amount) > 0)) return setPayMsg("Montant invalide.");
    setPaySaving(true);
    const res = await authFetch(`/education/fee-plans/${selected.id}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(payForm.amount), method: payForm.method, reference: payForm.reference }),
    });
    const data = await res.json().catch(() => ({}));
    setPaySaving(false);
    if (!res.ok) return setPayMsg(data?.error || "Erreur.");
    setPayMsg(`✅ Reçu ${data.payment?.receipt_number} enregistré.`);
    setPayForm({ amount: "", method: "especes", reference: "" });
    await refreshSelected(selected.id);
  };

  const cancelPayment = async (p: FeePayment) => {
    if (!selected) return;
    const res = await authFetch(`/education/fee-payments/${p.id}/cancel`, { method: "PATCH" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return setPayMsg(d?.error || "Erreur annulation."); }
    await refreshSelected(selected.id);
  };

  const rest = (p: Plan) => Math.max(0, Number(p.total_amount) - Number(p.total_paid));

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Plans de mensualités</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        {students.length === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">Aucun élève enregistré. Créez d&apos;abord vos élèves.</p>
            <Link href="/education/eleves" className="rounded-xl bg-amber-600 px-4 py-2 font-black text-white">Gérer les élèves</Link>
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Nouveau plan de scolarité</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className={label}>Élève</label><select className={input} value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}><option value="">Choisir</option>{students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.matricule})</option>)}</select></div>
            <div><label className={label}>Année scolaire</label><select className={input} value={form.school_year_id} onChange={(e) => setForm({ ...form, school_year_id: e.target.value })}><option value="">Choisir</option>{years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></div>
            <div><label className={label}>Classe</label><select className={input} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Choisir</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className={label}>Intitulé</label><input className={input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div><label className={label}>Montant total (FCFA)</label><input type="number" min={0} className={input} value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} placeholder="Ex. 450000" /></div>
            <div><label className={label}>Nombre de mensualités</label><input type="number" min={1} max={24} className={input} value={form.installments_count} onChange={(e) => setForm({ ...form, installments_count: e.target.value })} /></div>
            <div><label className={label}>1ʳᵉ échéance</label><input type="date" className={input} value={form.first_due_date} onChange={(e) => setForm({ ...form, first_due_date: e.target.value })} /></div>
          </div>
          <button onClick={create} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">{saving ? "Création…" : "Créer le plan"}</button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Plans en cours</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-gray-600">Aucun plan pour le moment.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-gray-500"><th className="p-2">Élève</th><th className="p-2">Intitulé</th><th className="p-2">Total</th><th className="p-2">Payé</th><th className="p-2">Reste</th><th className="p-2">Statut</th><th className="p-2">Actions</th></tr></thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="p-2 font-semibold text-gray-900">{p.first_name} {p.last_name}</td>
                      <td className="p-2 text-gray-700">{p.label} <span className="text-xs text-gray-400">×{p.installments_count}</span></td>
                      <td className="p-2 text-gray-700">{num(p.total_amount)}</td>
                      <td className="p-2 text-gray-700">{num(p.total_paid)}</td>
                      <td className="p-2 text-gray-700">{rest(p).toLocaleString("fr-FR")}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[p.status] || "bg-gray-200"}`}>{STATUS_FR[p.status] || p.status}</span></td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <button onClick={() => openPlan(p)} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700">Gérer</button>
                          <button onClick={() => downloadBlob(`/education/fee-plans/${p.id}/schedule/pdf`, `echeancier-${p.id}.pdf`)} className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800">Échéancier</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="mt-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">{selected.label} — {selected.first_name} {selected.last_name}</h3>
                <p className="text-xs text-gray-500">{selected.class_name || ""} · {selected.installments_count} mensualités</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl font-black text-gray-400 hover:text-gray-700">×</button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-gray-100 p-3"><p className="text-xs text-gray-500">Total</p><p className="font-black text-gray-900">{num(selected.total_amount)}</p></div>
              <div className="rounded-xl bg-green-50 p-3"><p className="text-xs text-gray-500">Payé</p><p className="font-black text-green-700">{num(selected.total_paid)}</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-gray-500">Reste</p><p className="font-black text-amber-700">{rest(selected).toLocaleString("fr-FR")}</p></div>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-black text-gray-900">Échéancier</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead><tr className="text-left text-gray-500"><th className="p-1">#</th><th className="p-1">Échéance</th><th className="p-1">Montant</th><th className="p-1">Payé</th><th className="p-1">Statut</th></tr></thead>
                  <tbody>
                    {(selected.installments || []).map((i) => (
                      <tr key={i.id} className="border-t border-gray-100">
                        <td className="p-1 text-gray-700">{i.seq}</td>
                        <td className="p-1 text-gray-700">{fmtDate(i.due_date)}</td>
                        <td className="p-1 text-gray-700">{num(i.amount)}</td>
                        <td className="p-1 text-gray-700">{num(i.amount_paid)}</td>
                        <td className="p-1"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[i.status] || "bg-gray-200"}`}>{STATUS_FR[i.status] || i.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {payMsg && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{payMsg}</div>}

            {selected.status !== "cancelled" && (
              <div className="mt-4 rounded-xl border border-gray-200 p-4">
                <p className="mb-2 font-black text-gray-900">Encaisser une mensualité</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input type="number" min={1} className={input} placeholder="Montant" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                  <select className={input} value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                    <option value="especes">Espèces</option><option value="wallet">Wallet MaliLink</option><option value="orange_money">Orange Money</option><option value="wave">Wave</option><option value="virement">Virement</option><option value="cheque">Chèque</option>
                  </select>
                  <input className={input} placeholder="Réf. (option.)" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
                </div>
                <button onClick={addPayment} disabled={paySaving} className="mt-3 rounded-xl bg-emerald-600 px-5 py-2 font-black text-white hover:bg-emerald-700 disabled:opacity-60">{paySaving ? "Enregistrement…" : "Encaisser & générer le reçu"}</button>
              </div>
            )}

            <div className="mt-4">
              <p className="mb-2 font-black text-gray-900">Versements</p>
              {(selected.payments || []).length === 0 ? (
                <p className="text-sm text-gray-500">Aucun versement.</p>
              ) : (
                <div className="space-y-2">
                  {(selected.payments || []).map((p) => (
                    <div key={p.id} className={`flex items-center justify-between rounded-xl border p-3 ${p.status === "cancelled" ? "border-red-200 bg-red-50 opacity-70" : "border-gray-200"}`}>
                      <div>
                        <p className="font-mono text-xs text-gray-500">{p.receipt_number || "—"}{p.status === "cancelled" && " (annulé)"}</p>
                        <p className="font-bold text-gray-900">{num(p.amount)} FCFA <span className="text-xs font-normal text-gray-500">· {p.method || "—"} · {fmtDate(p.created_at)}</span></p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => downloadBlob(`/education/fee-payments/${p.id}/receipt`, `recu-${p.receipt_number || p.id}.pdf`)} className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800">Reçu</button>
                        {p.status !== "cancelled" && <button onClick={() => cancelPayment(p)} className="rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200">Annuler</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
