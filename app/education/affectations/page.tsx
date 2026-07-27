"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type Teacher = { id: number; first_name: string; last_name: string; matricule: string };
type Named = { id: number; name: string };
type Assignment = {
  id: number; teacher_id: number; class_id: number; subject_id: number | null;
  coefficient: string | null; weekly_hours: string | null; is_main_teacher: boolean;
  can_enter_grades: boolean; can_take_attendance: boolean; can_publish_courses: boolean;
  teacher_first: string; teacher_last: string; class_name: string; subject_name: string | null;
};

const input = "w-full rounded-xl border border-gray-300 p-3 text-gray-900";
const label = "mb-1 block text-sm font-semibold text-gray-700";

export default function EducationAssignmentsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Named[]>([]);
  const [subjects, setSubjects] = useState<Named[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    teacher_id: "", class_id: "", subject_id: "", coefficient: "1", weekly_hours: "",
    is_main_teacher: false, can_enter_grades: true, can_take_attendance: true, can_publish_courses: true,
  });

  const loadAssignments = useCallback(async () => {
    const res = await authFetch("/education/teacher-assignments");
    if (res.ok) setAssignments(await res.json());
  }, []);

  useEffect(() => {
    authFetch("/education/teachers?status=actif").then(async (r) => r.ok && setTeachers(await r.json()));
    authFetch("/education/classes").then(async (r) => r.ok && setClasses(await r.json()));
    authFetch("/education/subjects").then(async (r) => r.ok && setSubjects(await r.json()));
    loadAssignments();
  }, [loadAssignments]);

  const create = async () => {
    setMsg("");
    if (!form.teacher_id || !form.class_id) return setMsg("Professeur et classe obligatoires.");
    setSaving(true);
    const res = await authFetch("/education/teacher-assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacher_id: Number(form.teacher_id), class_id: Number(form.class_id),
        subject_id: form.subject_id ? Number(form.subject_id) : null,
        coefficient: form.coefficient ? Number(form.coefficient) : null,
        weekly_hours: form.weekly_hours ? Number(form.weekly_hours) : null,
        is_main_teacher: form.is_main_teacher, can_enter_grades: form.can_enter_grades,
        can_take_attendance: form.can_take_attendance, can_publish_courses: form.can_publish_courses,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(data?.error || "Erreur.");
    setMsg("✅ Affectation créée.");
    setForm({ ...form, subject_id: "" });
    await loadAssignments();
  };

  const remove = async (id: number) => {
    await authFetch(`/education/teacher-assignments/${id}`, { method: "DELETE" });
    await loadAssignments();
  };

  const perms = (a: Assignment) => [a.can_enter_grades && "notes", a.can_take_attendance && "appel", a.can_publish_courses && "cours"].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Affectations professeurs</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>
        <p className="text-gray-600">Affectez un professeur à une matière et une classe, avec coefficient, volume horaire et permissions. Le coefficient défini ici est celui utilisé pour les moyennes et bulletins.</p>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        {teachers.length === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">Aucun professeur actif. Créez d&apos;abord vos professeurs.</p>
            <Link href="/education/professeurs" className="rounded-xl bg-amber-600 px-4 py-2 font-black text-white">Créer un professeur</Link>
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Nouvelle affectation</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className={label}>Professeur</label>
              <select className={input} value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                <option value="">Choisir</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.matricule})</option>)}
              </select>
            </div>
            <div><label className={label}>Classe</label>
              <select className={input} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                <option value="">Choisir</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className={label}>Matière</label>
              <select className={input} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                <option value="">Choisir</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className={label}>Coefficient</label><input type="number" min={0} step={0.5} className={input} value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} /></div>
            <div><label className={label}>Volume horaire (h/semaine)</label><input type="number" min={0} step={0.5} className={input} value={form.weekly_hours} onChange={(e) => setForm({ ...form, weekly_hours: e.target.value })} placeholder="Ex. 4" /></div>
            <label className="flex items-center gap-2 self-end text-sm font-semibold text-gray-700"><input type="checkbox" checked={form.is_main_teacher} onChange={(e) => setForm({ ...form, is_main_teacher: e.target.checked })} /> Professeur principal</label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={form.can_enter_grades} onChange={(e) => setForm({ ...form, can_enter_grades: e.target.checked })} /> Peut saisir les notes</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={form.can_take_attendance} onChange={(e) => setForm({ ...form, can_take_attendance: e.target.checked })} /> Peut faire l&apos;appel</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={form.can_publish_courses} onChange={(e) => setForm({ ...form, can_publish_courses: e.target.checked })} /> Peut publier des cours</label>
          </div>
          <button onClick={create} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">
            {saving ? "Enregistrement…" : "Affecter"}
          </button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Affectations existantes</h2>
          {assignments.length === 0 ? (
            <p className="mt-3 text-gray-600">Aucune affectation pour le moment.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-gray-500"><th className="p-2">Professeur</th><th className="p-2">Classe</th><th className="p-2">Matière</th><th className="p-2">Coef.</th><th className="p-2">Vol.</th><th className="p-2">Principal</th><th className="p-2">Permissions</th><th className="p-2"></th></tr></thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-t border-gray-100">
                      <td className="p-2 font-semibold text-gray-900">{a.teacher_first} {a.teacher_last}</td>
                      <td className="p-2 text-gray-700">{a.class_name}</td>
                      <td className="p-2 text-gray-700">{a.subject_name || "—"}</td>
                      <td className="p-2 text-gray-700">{a.coefficient ?? "—"}</td>
                      <td className="p-2 text-gray-700">{a.weekly_hours ? `${a.weekly_hours} h` : "—"}</td>
                      <td className="p-2">{a.is_main_teacher ? "✅" : "—"}</td>
                      <td className="p-2 text-xs text-gray-600">{perms(a) || "—"}</td>
                      <td className="p-2"><button onClick={() => remove(a.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50">Retirer</button></td>
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
