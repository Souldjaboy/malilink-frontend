"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

type Fee = { id: number; label: string; fee_type: string; amount: string; class_name: string | null; due_date: string | null };
type Student = { id: number; first_name: string; last_name: string; matricule: string };
type Finance = {
  fees: { id: number; label: string; amount: string; paid: string; remaining: string }[];
  payments: { id: number; amount: string; payment_method: string; paid_at: string }[];
};

export default function EducationPaiementsPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeForm, setFeeForm] = useState({ label: "", fee_type: "scolarite", amount: "", due_date: "" });
  const [payForm, setPayForm] = useState({ student_id: "", fee_id: "", amount: "", payment_method: "especes" });
  const [selectedStudent, setSelectedStudent] = useState("");
  const [finance, setFinance] = useState<Finance | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [fRes, sRes] = await Promise.all([
      authFetch("/education/fees"),
      authFetch("/education/students"),
    ]);
    if (fRes.ok) setFees(await fRes.json());
    if (sRes.ok) setStudents(await sRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedStudent) {
      setFinance(null);
      return;
    }
    authFetch(`/education/students/${selectedStudent}/finances`).then(async (r) => {
      if (r.ok) setFinance(await r.json());
    });
  }, [selectedStudent]);

  const createFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch("/education/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: feeForm.label,
        fee_type: feeForm.fee_type,
        amount: Number(feeForm.amount),
        due_date: feeForm.due_date || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error || "Erreur");
      return;
    }
    setFeeForm({ label: "", fee_type: "scolarite", amount: "", due_date: "" });
    await load();
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await authFetch("/education/fee-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: Number(payForm.student_id),
        fee_id: Number(payForm.fee_id),
        amount: Number(payForm.amount),
        payment_method: payForm.payment_method,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "✅ Paiement enregistré" : `❌ ${data?.error || "Erreur"}`);
    if (res.ok) {
      setPayForm({ ...payForm, amount: "" });
      if (selectedStudent === payForm.student_id) {
        const r = await authFetch(`/education/students/${selectedStudent}/finances`);
        if (r.ok) setFinance(await r.json());
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Paiements scolaires</h1>
          <Link href="/education" className="font-bold text-blue-700">← Education</Link>
        </div>

        {message && <p className="rounded-xl bg-blue-50 p-3 font-semibold text-blue-800">{message}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-black text-gray-900">Frais définis</h2>
            <form onSubmit={createFee} className="mt-3 grid grid-cols-2 gap-2">
              <input value={feeForm.label} onChange={(e) => setFeeForm({ ...feeForm, label: e.target.value })} placeholder="Libellé (ex: Scolarité octobre)" required className="col-span-2 rounded-xl border border-gray-300 p-3 text-gray-900" />
              <select value={feeForm.fee_type} onChange={(e) => setFeeForm({ ...feeForm, fee_type: e.target.value })} className="rounded-xl border border-gray-300 p-3 text-gray-900">
                <option value="inscription">Inscription</option>
                <option value="scolarite">Scolarité</option>
                <option value="cantine">Cantine</option>
                <option value="transport">Transport</option>
                <option value="uniforme">Uniforme</option>
                <option value="examen">Examen</option>
                <option value="autre">Autre</option>
              </select>
              <input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} placeholder="Montant FCFA" required className="rounded-xl border border-gray-300 p-3 text-gray-900" />
              <input type="date" value={feeForm.due_date} onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })} className="rounded-xl border border-gray-300 p-3 text-gray-900" />
              <button type="submit" className="rounded-xl bg-yellow-500 p-3 font-black text-black">+ Ajouter</button>
            </form>
            <div className="mt-4 space-y-2">
              {fees.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">
                    {f.label}
                    <span className="ml-2 text-sm font-normal text-gray-500">{f.class_name || "toutes classes"}</span>
                  </p>
                  <p className="font-black text-gray-900">{formatFCFA(Number(f.amount))}</p>
                </div>
              ))}
              {fees.length === 0 && <p className="text-gray-500">Aucun frais défini.</p>}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-black text-gray-900">Enregistrer un paiement</h2>
            <form onSubmit={recordPayment} className="mt-3 space-y-3">
              <select value={payForm.student_id} onChange={(e) => setPayForm({ ...payForm, student_id: e.target.value })} required className="w-full rounded-xl border border-gray-300 p-3 text-gray-900">
                <option value="">Élève</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.matricule})</option>
                ))}
              </select>
              <select value={payForm.fee_id} onChange={(e) => setPayForm({ ...payForm, fee_id: e.target.value })} required className="w-full rounded-xl border border-gray-300 p-3 text-gray-900">
                <option value="">Frais concerné</option>
                {fees.map((f) => (
                  <option key={f.id} value={f.id}>{f.label} — {formatFCFA(Number(f.amount))}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="Montant payé" required className="rounded-xl border border-gray-300 p-3 text-gray-900" />
                <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="rounded-xl border border-gray-300 p-3 text-gray-900">
                  <option value="especes">Espèces</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                  <option value="moov_money">Moov Money</option>
                  <option value="carte">Carte</option>
                </select>
              </div>
              <button type="submit" className="w-full rounded-xl bg-yellow-500 p-3 font-black text-black">
                Encaisser
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Situation d&apos;un élève</h2>
          <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="mt-3 rounded-xl border border-gray-300 p-3 text-gray-900">
            <option value="">Choisir un élève</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.matricule})</option>
            ))}
          </select>

          {finance && (
            <div className="mt-4 space-y-2">
              {finance.fees.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">{f.label}</p>
                  <p className={`font-black ${Number(f.remaining) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {Number(f.remaining) > 0
                      ? `Reste ${formatFCFA(Number(f.remaining))}`
                      : "Soldé ✓"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
