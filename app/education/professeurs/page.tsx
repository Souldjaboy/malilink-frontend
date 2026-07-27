"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type Teacher = {
  id: number; matricule: string; first_name: string; last_name: string; gender: string;
  phone: string; email: string; specialty: string; diploma: string; contract_type: string;
  hire_date: string | null; status: string; assignment_count: number;
};

const input = "w-full rounded-xl border border-gray-300 p-3 text-gray-900 placeholder:text-gray-400";
const label = "mb-1 block text-sm font-semibold text-gray-700";

export default function EducationTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", gender: "M", phone: "", email: "",
    specialty: "", diploma: "", contract_type: "CDI", hire_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    const res = await authFetch(`/education/teachers?${params.toString()}`);
    if (res.ok) setTeachers(await res.json());
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const create = async () => {
    setMsg("");
    if (!form.first_name.trim() || !form.last_name.trim()) return setMsg("Prénom et nom obligatoires.");
    setSaving(true);
    const res = await authFetch("/education/teachers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(data?.error || "Erreur création.");
    setMsg(`✅ Professeur créé — matricule ${data.matricule}.`);
    setForm({ first_name: "", last_name: "", gender: "M", phone: "", email: "", specialty: "", diploma: "", contract_type: "CDI", hire_date: "" });
    await load();
  };

  const toggleStatus = async (t: Teacher) => {
    const next = t.status === "actif" ? "inactif" : "actif";
    await authFetch(`/education/teachers/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Professeurs</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Nouveau professeur</h2>
          <p className="mb-3 text-sm text-gray-600">Le matricule (PROF-AAAA-NNNNN) est généré automatiquement.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className={label}>Prénom</label><input className={input} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Ex. Mamadou" /></div>
            <div><label className={label}>Nom</label><input className={input} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Ex. Diallo" /></div>
            <div><label className={label}>Sexe</label><select className={input} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
            <div><label className={label}>Téléphone</label><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex. +223 70 00 00 00" /></div>
            <div><label className={label}>E-mail</label><input type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Ex. m.diallo@ecole.ml" /></div>
            <div><label className={label}>Spécialité / matière</label><input className={input} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ex. Anglais" /></div>
            <div><label className={label}>Diplôme</label><input className={input} value={form.diploma} onChange={(e) => setForm({ ...form, diploma: e.target.value })} placeholder="Ex. Maîtrise d'anglais" /></div>
            <div><label className={label}>Type de contrat</label><select className={input} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}><option>CDI</option><option>CDD</option><option>Vacataire</option><option>Stage</option></select></div>
            <div><label className={label}>Date d&apos;embauche</label><input type="date" className={input} value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
          </div>
          <button onClick={create} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">
            {saving ? "Enregistrement…" : "Créer le professeur"}
          </button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Liste des professeurs</h2>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, matricule, téléphone…" className="rounded-xl border border-gray-300 p-2 text-gray-900" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-300 p-2 text-gray-900">
                <option value="">Tous</option><option value="actif">Actifs</option><option value="inactif">Inactifs</option>
              </select>
            </div>
          </div>
          {loading ? (
            <p className="mt-4 text-gray-500">Chargement…</p>
          ) : teachers.length === 0 ? (
            <p className="mt-4 text-gray-600">Aucun professeur enregistré. Créez-en un avec le formulaire ci-dessus.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="text-left text-gray-500"><th className="p-2">Matricule</th><th className="p-2">Nom</th><th className="p-2">Spécialité</th><th className="p-2">Téléphone</th><th className="p-2">Affectations</th><th className="p-2">Statut</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="p-2 font-mono text-xs text-gray-900">{t.matricule}</td>
                      <td className="p-2 font-semibold text-gray-900">{t.first_name} {t.last_name}</td>
                      <td className="p-2 text-gray-700">{t.specialty || "—"}</td>
                      <td className="p-2 text-gray-700">{t.phone || "—"}</td>
                      <td className="p-2 text-gray-700">{t.assignment_count}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.status === "actif" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>{t.status === "actif" ? "Actif" : "Inactif"}</span></td>
                      <td className="p-2"><button onClick={() => toggleStatus(t)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50">{t.status === "actif" ? "Désactiver" : "Réactiver"}</button></td>
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
