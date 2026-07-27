"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type Student = { id: number; first_name: string; last_name: string; matricule: string };
type Named = { id: number; name: string };
type Year = { id: number; label: string };
type Enrollment = {
  id: number; reference: string; first_name: string; last_name: string; student_matricule: string;
  class_name: string | null; enrollment_fee: string; amount_paid: string; currency: string; status: string;
};

const input = "w-full rounded-xl border border-gray-300 p-3 text-gray-900";
const label = "mb-1 block text-sm font-semibold text-gray-700";
const STATUS_FR: Record<string, string> = { pending: "En attente", partially_paid: "Partiel", paid: "Payé", cancelled: "Annulé", refunded: "Remboursé" };
const STATUS_COLOR: Record<string, string> = { paid: "bg-green-100 text-green-800", partially_paid: "bg-amber-100 text-amber-800", pending: "bg-gray-200 text-gray-700", cancelled: "bg-red-100 text-red-800" };

export default function EducationEnrollmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Named[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [items, setItems] = useState<Enrollment[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ student_id: "", school_year_id: "", class_id: "", enrollment_fee: "", amount_paid: "", payment_method: "especes" });

  const load = useCallback(async () => {
    const res = await authFetch("/education/enrollments");
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
    setSaving(true);
    const res = await authFetch("/education/enrollments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: Number(form.student_id), school_year_id: form.school_year_id ? Number(form.school_year_id) : null,
        class_id: form.class_id ? Number(form.class_id) : null, enrollment_fee: Number(form.enrollment_fee || 0),
        amount_paid: Number(form.amount_paid || 0), payment_method: form.payment_method,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(data?.error || "Erreur.");
    setMsg(`✅ Inscription ${data.reference} enregistrée.`);
    setForm({ student_id: "", school_year_id: "", class_id: "", enrollment_fee: "", amount_paid: "", payment_method: "especes" });
    await load();
  };

  const downloadPdf = async (e: Enrollment) => {
    const res = await authFetch(`/education/enrollments/${e.id}/pdf`);
    if (!res.ok) return setMsg("Erreur téléchargement de la fiche.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `fiche-inscription-${e.reference}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const rest = (e: Enrollment) => Math.max(0, Number(e.enrollment_fee) - Number(e.amount_paid));

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Inscriptions</h1>
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
          <h2 className="text-lg font-black text-gray-900">Nouvelle inscription</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className={label}>Élève</label><select className={input} value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}><option value="">Choisir</option>{students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.matricule})</option>)}</select></div>
            <div><label className={label}>Année scolaire</label><select className={input} value={form.school_year_id} onChange={(e) => setForm({ ...form, school_year_id: e.target.value })}><option value="">Choisir</option>{years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></div>
            <div><label className={label}>Classe</label><select className={input} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Choisir</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className={label}>Frais d&apos;inscription</label><input type="number" min={0} className={input} value={form.enrollment_fee} onChange={(e) => setForm({ ...form, enrollment_fee: e.target.value })} placeholder="Ex. 50000" /></div>
            <div><label className={label}>Montant payé</label><input type="number" min={0} className={input} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} placeholder="Ex. 30000" /></div>
            <div><label className={label}>Moyen de paiement</label><select className={input} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="especes">Espèces</option><option value="wallet">Wallet MaliLink</option><option value="orange_money">Orange Money</option><option value="wave">Wave</option><option value="virement">Virement</option><option value="cheque">Chèque</option></select></div>
          </div>
          <button onClick={create} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">{saving ? "Enregistrement…" : "Inscrire l'élève"}</button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Inscriptions récentes</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-gray-600">Aucune inscription pour le moment.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-gray-500"><th className="p-2">Référence</th><th className="p-2">Élève</th><th className="p-2">Classe</th><th className="p-2">Frais</th><th className="p-2">Payé</th><th className="p-2">Reste</th><th className="p-2">Statut</th><th className="p-2">Fiche</th></tr></thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="p-2 font-mono text-xs text-gray-900">{e.reference}</td>
                      <td className="p-2 font-semibold text-gray-900">{e.first_name} {e.last_name}</td>
                      <td className="p-2 text-gray-700">{e.class_name || "—"}</td>
                      <td className="p-2 text-gray-700">{Number(e.enrollment_fee).toLocaleString("fr-FR")}</td>
                      <td className="p-2 text-gray-700">{Number(e.amount_paid).toLocaleString("fr-FR")}</td>
                      <td className="p-2 text-gray-700">{rest(e).toLocaleString("fr-FR")}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[e.status] || "bg-gray-200"}`}>{STATUS_FR[e.status] || e.status}</span></td>
                      <td className="p-2"><button onClick={() => downloadPdf(e)} className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800">PDF</button></td>
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
