"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type ClassItem = { id: number; name: string; level: string | null; student_count: string };
type Subject = { id: number; name: string; coefficient: string };

export default function EducationClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classForm, setClassForm] = useState({ name: "", level: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", coefficient: "1" });
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [cRes, sRes] = await Promise.all([
      authFetch("/education/classes"),
      authFetch("/education/subjects"),
    ]);
    if (cRes.ok) setClasses(await cRes.json());
    if (sRes.ok) setSubjects(await sRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch("/education/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(classForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data?.error || "Erreur");
      return;
    }
    setClassForm({ name: "", level: "" });
    await load();
  };

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch("/education/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subjectForm.name, coefficient: Number(subjectForm.coefficient) || 1 }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data?.error || "Erreur");
      return;
    }
    setSubjectForm({ name: "", coefficient: "1" });
    await load();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Classes & matières</h1>
          <Link href="/education" className="font-bold text-blue-700">← Education</Link>
        </div>

        {message && <p className="rounded-xl bg-red-50 p-3 font-semibold text-red-700">{message}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-black text-gray-900">Classes</h2>
            <form onSubmit={createClass} className="mt-3 flex gap-2">
              <input
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                placeholder="Ex: 6ème A"
                required
                className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900"
              />
              <input
                value={classForm.level}
                onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                placeholder="Niveau"
                className="w-28 rounded-xl border border-gray-300 p-3 text-gray-900"
              />
              <button type="submit" className="rounded-xl bg-yellow-500 px-4 font-black text-black">+</button>
            </form>
            <div className="mt-4 space-y-2">
              {classes.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.student_count} élève(s)</p>
                </div>
              ))}
              {classes.length === 0 && <p className="text-gray-500">Aucune classe.</p>}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-black text-gray-900">Matières & coefficients</h2>
            <form onSubmit={createSubject} className="mt-3 flex gap-2">
              <input
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="Ex: Mathématiques"
                required
                className="flex-1 rounded-xl border border-gray-300 p-3 text-gray-900"
              />
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={subjectForm.coefficient}
                onChange={(e) => setSubjectForm({ ...subjectForm, coefficient: e.target.value })}
                className="w-24 rounded-xl border border-gray-300 p-3 text-gray-900"
                title="Coefficient"
              />
              <button type="submit" className="rounded-xl bg-yellow-500 px-4 font-black text-black">+</button>
            </form>
            <div className="mt-4 space-y-2">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-500">Coef. {s.coefficient}</p>
                </div>
              ))}
              {subjects.length === 0 && <p className="text-gray-500">Aucune matière.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
