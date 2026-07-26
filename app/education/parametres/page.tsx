"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type SchoolYear = { id: number; label: string; start_date: string | null; end_date: string | null; is_active: boolean };
type Term = { id: number; school_year_id: number; label: string; term_order: number; start_date: string | null; end_date: string | null };

const input = "w-full rounded-xl border border-gray-300 p-3 text-gray-900 placeholder:text-gray-400";
const card = "rounded-2xl bg-white p-6 shadow";

// Trimestres standards proposés lors de la création d'une année.
const STANDARD_TERMS = [
  { label: "Trimestre 1", term_order: 1 },
  { label: "Trimestre 2", term_order: 2 },
  { label: "Trimestre 3", term_order: 3 },
];

export default function EducationParametresPage() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [yearForm, setYearForm] = useState({ label: "", start_date: "", end_date: "", is_active: true, createStandard: true });
  const [termForm, setTermForm] = useState({ school_year_id: "", label: "", term_order: "1", start_date: "", end_date: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [y, t] = await Promise.all([authFetch("/education/school-years"), authFetch("/education/terms")]);
    if (y.ok) setYears(await y.json());
    if (t.ok) setTerms(await t.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const createYear = async () => {
    setMsg("");
    if (!yearForm.label.trim()) return setMsg("Libellé de l'année obligatoire (ex. 2026–2027).");
    const res = await authFetch("/education/school-years", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: yearForm.label.trim(), start_date: yearForm.start_date || null, end_date: yearForm.end_date || null, is_active: yearForm.is_active }),
    });
    const year = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(year?.error || "Erreur création de l'année.");
    // Création automatique des 3 trimestres standards si demandé.
    if (yearForm.createStandard) {
      for (const st of STANDARD_TERMS) {
        await authFetch("/education/terms", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ school_year_id: year.id, label: st.label, term_order: st.term_order }),
        });
      }
    }
    setYearForm({ label: "", start_date: "", end_date: "", is_active: true, createStandard: true });
    setMsg(`✅ Année « ${year.label} » créée${yearForm.createStandard ? " avec 3 trimestres" : ""}.`);
    await load();
  };

  const createTerm = async () => {
    setMsg("");
    if (!termForm.school_year_id) return setMsg("Choisissez d'abord une année scolaire.");
    if (!termForm.label.trim()) return setMsg("Libellé de la période obligatoire.");
    const res = await authFetch("/education/terms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_year_id: Number(termForm.school_year_id), label: termForm.label.trim(),
        term_order: Number(termForm.term_order) || 1, start_date: termForm.start_date || null, end_date: termForm.end_date || null,
      }),
    });
    const t = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(t?.error || "Erreur création de la période.");
    setTermForm({ ...termForm, label: "", start_date: "", end_date: "" });
    setMsg(`✅ Période « ${t.label} » créée.`);
    await load();
  };

  const yearLabel = (id: number) => years.find((y) => y.id === id)?.label || "—";

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Années & périodes scolaires</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>
        <p className="text-gray-600">Créez l&apos;année scolaire active puis ses périodes (trimestres, semestres, séquences). Les périodes alimentent les évaluations, les moyennes et les bulletins.</p>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Créer une année */}
          <section className={card}>
            <h2 className="text-lg font-black text-gray-900">Nouvelle année scolaire</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Libellé de l&apos;année</label>
                <input className={input} value={yearForm.label} onChange={(e) => setYearForm({ ...yearForm, label: e.target.value })} placeholder="Ex. 2026–2027" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Début</label><input type="date" className={input} value={yearForm.start_date} onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Fin</label><input type="date" className={input} value={yearForm.end_date} onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={yearForm.is_active} onChange={(e) => setYearForm({ ...yearForm, is_active: e.target.checked })} /> Année active</label>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={yearForm.createStandard} onChange={(e) => setYearForm({ ...yearForm, createStandard: e.target.checked })} /> Créer automatiquement les 3 trimestres</label>
              <button onClick={createYear} className="w-full rounded-xl bg-yellow-500 p-3 font-black text-black hover:bg-yellow-400">Créer l&apos;année</button>
            </div>
          </section>

          {/* Ajouter une période */}
          <section className={card}>
            <h2 className="text-lg font-black text-gray-900">Ajouter une période</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Année scolaire</label>
                <select className={input} value={termForm.school_year_id} onChange={(e) => setTermForm({ ...termForm, school_year_id: e.target.value })}>
                  <option value="">Choisir une année</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_active ? " (active)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Libellé de la période</label>
                <input className={input} value={termForm.label} onChange={(e) => setTermForm({ ...termForm, label: e.target.value })} placeholder="Ex. Trimestre 1, Semestre 1, Séquence 2" />
              </div>
              <div><label className="mb-1 block text-sm font-semibold text-gray-700">Ordre</label><input type="number" min={1} className={input} value={termForm.term_order} onChange={(e) => setTermForm({ ...termForm, term_order: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Début</label><input type="date" className={input} value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-semibold text-gray-700">Fin</label><input type="date" className={input} value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} /></div>
              </div>
              <button onClick={createTerm} className="w-full rounded-xl bg-blue-700 p-3 font-black text-white hover:bg-blue-800">Ajouter la période</button>
            </div>
          </section>
        </div>

        {/* Périodes existantes */}
        <section className={card}>
          <h2 className="text-lg font-black text-gray-900">Périodes existantes</h2>
          {loading ? (
            <p className="mt-3 text-gray-500">Chargement…</p>
          ) : terms.length === 0 ? (
            <p className="mt-3 text-gray-600">Aucune période créée pour le moment. Créez une année scolaire ci-dessus (les 3 trimestres seront ajoutés automatiquement).</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="text-left text-gray-500"><th className="p-2">Période</th><th className="p-2">Année</th><th className="p-2">Ordre</th><th className="p-2">Début</th><th className="p-2">Fin</th></tr></thead>
                <tbody>
                  {terms.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="p-2 font-semibold text-gray-900">{t.label}</td>
                      <td className="p-2 text-gray-700">{yearLabel(t.school_year_id)}</td>
                      <td className="p-2 text-gray-700">{t.term_order}</td>
                      <td className="p-2 text-gray-700">{t.start_date || "—"}</td>
                      <td className="p-2 text-gray-700">{t.end_date || "—"}</td>
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
