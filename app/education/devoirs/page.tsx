"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, apiUrl } from "../../lib/api";

type ClassItem = { id: number; name: string };
type Subject = { id: number; name: string };
type Assignment = {
  id: number; class_id: number; title: string; content: string | null; due_date: string | null;
  file_url: string | null; file_name: string | null; is_published: boolean;
  class_name: string; subject_name: string | null; teacher_name: string;
  submissions_count: string; graded_count: string; class_size: string;
};
type SubmissionRow = {
  student_id: number; first_name: string; last_name: string; matricule: string;
  submission_id: number | null; content: string | null; file_url: string | null; file_name: string | null;
  status: string | null; score: string | null; max_score: string | null; feedback: string | null;
  correction_file_url: string | null; correction_file_name: string | null; submitted_at: string | null;
};

const inputCls = "w-full rounded-xl border border-gray-300 p-3 text-gray-900";
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—");

export default function EducationAssignmentsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Assignment[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ class_id: "", subject_id: "", title: "", content: "", due_date: "" });
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({});

  const load = useCallback(async () => {
    const res = await authFetch("/education/assignments");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    authFetch("/education/classes").then(async (r) => r.ok && setClasses(await r.json()));
    authFetch("/education/subjects").then(async (r) => r.ok && setSubjects(await r.json()));
    load();
  }, [load]);

  const create = async () => {
    setMsg("");
    if (!form.class_id) return setMsg("Sélectionnez une classe.");
    if (!form.title.trim()) return setMsg("Le titre est requis.");
    setSaving(true);
    try {
      let file_url: string | null = null, file_name: string | null = null;
      if (file) {
        const fd = new FormData(); fd.append("file", file);
        const up = await authFetch("/education/courses/upload", { method: "POST", body: fd });
        if (!up.ok) { const d = await up.json().catch(() => ({})); setSaving(false); return setMsg(d?.error || "Échec du téléversement."); }
        const d = await up.json(); file_url = d.file_url; file_name = d.file_name;
      }
      const res = await authFetch("/education/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: Number(form.class_id), subject_id: form.subject_id ? Number(form.subject_id) : null,
          title: form.title, content: form.content || null, due_date: form.due_date || null, file_url, file_name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaving(false); return setMsg(data?.error || "Erreur."); }
      setMsg("✅ Devoir publié.");
      setForm({ class_id: form.class_id, subject_id: "", title: "", content: "", due_date: "" });
      setFile(null);
      await load();
    } finally { setSaving(false); }
  };

  const openSubmissions = async (a: Assignment) => {
    setSelected(a); setRows([]); setGrades({});
    const res = await authFetch(`/education/assignments/${a.id}/submissions`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.submissions);
      const g: Record<number, { score: string; feedback: string }> = {};
      for (const r of data.submissions) if (r.submission_id) g[r.submission_id] = { score: r.score ?? "", feedback: r.feedback ?? "" };
      setGrades(g);
    }
  };

  const grade = async (r: SubmissionRow) => {
    if (!r.submission_id || !selected) return;
    const g = grades[r.submission_id];
    const res = await authFetch(`/education/submissions/${r.submission_id}/grade`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: g.score === "" ? null : Number(g.score), feedback: g.feedback }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); return setMsg(`❌ ${d?.error || "Erreur"}`); }
    await openSubmissions(selected);
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Devoirs & corrections</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Donner un devoir</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Classe</label><select className={inputCls} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Choisir</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Matière</label><select className={inputCls} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}><option value="">(optionnel)</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-700">Titre</label><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Rédaction : mon village" /></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-700">Consignes</label><textarea rows={3} className={inputCls} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Décrivez le travail à faire…" /></div>
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Date limite</label><input type="date" className={inputCls} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Énoncé joint (option.)</label><input type="file" className="w-full text-sm text-gray-700" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          </div>
          <button onClick={create} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">{saving ? "Publication…" : "Publier le devoir"}</button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Devoirs donnés</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-gray-600">Aucun devoir pour le moment.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {items.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
                  <div>
                    <p className="text-lg font-black text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.class_name}{a.subject_name ? ` · ${a.subject_name}` : ""} · limite {fmtDate(a.due_date)} · {a.teacher_name}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-700">{a.submissions_count}/{a.class_size} rendus · {a.graded_count} corrigés</p>
                  </div>
                  <button onClick={() => openSubmissions(a)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Corriger</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="mt-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-900">{selected.title}</h3>
                <p className="text-xs text-gray-500">{selected.class_name} · limite {fmtDate(selected.due_date)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl font-black text-gray-400 hover:text-gray-700">×</button>
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((r) => (
                <div key={r.student_id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-gray-900">{r.first_name} {r.last_name} <span className="text-xs font-normal text-gray-400">{r.matricule}</span></p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === "graded" ? "bg-green-100 text-green-800" : r.status === "submitted" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-600"}`}>
                      {r.status === "graded" ? "Corrigé" : r.status === "submitted" ? "Rendu" : "Non rendu"}
                    </span>
                  </div>
                  {r.submission_id ? (
                    <>
                      {r.content && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-sm text-gray-700">{r.content}</p>}
                      {r.file_url && <a href={apiUrl(r.file_url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800">📎 {r.file_name || "Voir le rendu"}</a>}
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600">Note /{Number(r.max_score || 20)}</label>
                          <input type="number" min={0} max={Number(r.max_score || 20)} step="0.25" className="w-24 rounded-lg border border-gray-300 p-2 text-right text-gray-900"
                            value={grades[r.submission_id]?.score ?? ""} onChange={(e) => setGrades({ ...grades, [r.submission_id!]: { ...grades[r.submission_id!], score: e.target.value } })} />
                        </div>
                        <input className="min-w-[200px] flex-1 rounded-lg border border-gray-300 p-2 text-gray-900" placeholder="Appréciation / correction"
                          value={grades[r.submission_id]?.feedback ?? ""} onChange={(e) => setGrades({ ...grades, [r.submission_id!]: { ...grades[r.submission_id!], feedback: e.target.value } })} />
                        <button onClick={() => grade(r)} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-black text-black hover:bg-yellow-400">Enregistrer</button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400">Aucun rendu déposé.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
