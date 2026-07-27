"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type Teacher = { id: number; first_name: string; last_name: string };
type Named = { id: number; name: string };
type Slot = {
  id: number; teacher_id: number | null; class_id: number; subject_id: number | null;
  day_of_week: number; start_time: string; end_time: string; room: string;
  session_type: string; mode: string; teacher_first: string | null; teacher_last: string | null;
  class_name: string; subject_name: string | null;
};

const DAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const input = "w-full rounded-xl border border-gray-300 p-3 text-gray-900";
const label = "mb-1 block text-sm font-semibold text-gray-700";
const h = (t: string) => t.slice(0, 5);

export default function EducationTimetablePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Named[]>([]);
  const [subjects, setSubjects] = useState<Named[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [viewClass, setViewClass] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    teacher_id: "", class_id: "", subject_id: "", day_of_week: "1",
    start_time: "08:00", end_time: "10:00", room: "", session_type: "cours", mode: "presentiel",
  });

  const loadSlots = useCallback(async () => {
    const params = new URLSearchParams();
    if (viewClass) params.set("class_id", viewClass);
    const res = await authFetch(`/education/schedules?${params.toString()}`);
    if (res.ok) setSlots(await res.json());
  }, [viewClass]);

  useEffect(() => {
    authFetch("/education/teachers?status=actif").then(async (r) => r.ok && setTeachers(await r.json()));
    authFetch("/education/classes").then(async (r) => r.ok && setClasses(await r.json()));
    authFetch("/education/subjects").then(async (r) => r.ok && setSubjects(await r.json()));
  }, []);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  const create = async () => {
    setMsg("");
    if (!form.class_id) return setMsg("La classe est obligatoire.");
    setSaving(true);
    const res = await authFetch("/education/schedules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null, class_id: Number(form.class_id),
        subject_id: form.subject_id ? Number(form.subject_id) : null, day_of_week: Number(form.day_of_week),
        start_time: form.start_time, end_time: form.end_time, room: form.room,
        session_type: form.session_type, mode: form.mode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg(`❌ ${data?.error || "Erreur."}`);
    setMsg("✅ Cours ajouté à l'emploi du temps.");
    await loadSlots();
  };

  const remove = async (id: number) => {
    await authFetch(`/education/schedules/${id}`, { method: "DELETE" });
    await loadSlots();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Emploi du temps</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>

        {msg && <div className={`rounded-xl p-4 font-semibold ${msg.startsWith("❌") ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-900"}`}>{msg}</div>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Ajouter un cours</h2>
          <p className="mb-3 text-sm text-gray-600">Les conflits (professeur, classe ou salle déjà occupés) sont détectés automatiquement.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className={label}>Classe</label><select className={input} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Choisir</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className={label}>Professeur</label><select className={input} value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}><option value="">—</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            <div><label className={label}>Matière</label><select className={input} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}><option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className={label}>Jour</label><select className={input} value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}>{[1,2,3,4,5,6,7].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}</select></div>
            <div><label className={label}>Heure de début</label><input type="time" className={input} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><label className={label}>Heure de fin</label><input type="time" className={input} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div><label className={label}>Salle</label><input className={input} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Ex. Salle A" /></div>
            <div><label className={label}>Type</label><select className={input} value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}><option value="cours">Cours</option><option value="td">Travaux dirigés</option><option value="tp">Travaux pratiques</option><option value="revision">Révision</option><option value="examen">Examen</option><option value="online">Cours en ligne</option></select></div>
          </div>
          <button onClick={create} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">{saving ? "Enregistrement…" : "Ajouter le cours"}</button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Emploi du temps</h2>
            <select value={viewClass} onChange={(e) => setViewClass(e.target.value)} className="rounded-xl border border-gray-300 p-2 text-gray-900">
              <option value="">Toutes les classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {slots.length === 0 ? (
            <p className="mt-4 text-gray-600">Aucun cours programmé.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6,7].map((d) => {
                const daySlots = slots.filter((s) => s.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (daySlots.length === 0) return null;
                return (
                  <div key={d} className="rounded-xl border border-gray-200 p-3">
                    <p className="mb-2 font-black text-gray-900">{DAYS[d]}</p>
                    <div className="space-y-2">
                      {daySlots.map((s) => (
                        <div key={s.id} className="rounded-lg bg-gray-50 p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">{h(s.start_time)}–{h(s.end_time)}</span>
                            <button onClick={() => remove(s.id)} className="text-xs font-bold text-red-600 hover:underline">retirer</button>
                          </div>
                          <p className="text-gray-800">{s.subject_name || "Cours"} · {s.class_name}</p>
                          <p className="text-xs text-gray-500">{s.teacher_first ? `${s.teacher_first} ${s.teacher_last}` : "—"}{s.room ? ` · ${s.room}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
