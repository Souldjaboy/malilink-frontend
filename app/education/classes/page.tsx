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
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editClass, setEditClass] = useState({ name: "", level: "" });
  const [editSubject, setEditSubject] = useState({ name: "", coefficient: "1" });
  const [busy, setBusy] = useState(false);

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


  const mutate = async (url: string, method: "PATCH" | "DELETE", payload?: object) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await authFetch(url, {
        method,
        ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "L'opération a échoué.");
      await load();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur réseau.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveClass = async (id: number) => {
    if (!editClass.name.trim()) { setMessage("Le nom de la classe est obligatoire."); return; }
    if (await mutate(`/education/classes/${id}`, "PATCH", editClass)) setEditingClassId(null);
  };
  const saveSubject = async (id: number) => {
    const coef = Number(editSubject.coefficient);
    if (!editSubject.name.trim() || !Number.isFinite(coef) || coef < 0.5 || coef > 20) {
      setMessage("Saisissez un nom et un coefficient entre 0,5 et 20.");
      return;
    }
    if (await mutate(`/education/subjects/${id}`, "PATCH", { name: editSubject.name, coefficient: coef }))
      setEditingSubjectId(null);
  };
  const removeItem = async (kind: "classes" | "subjects", id: number, name: string) => {
    const label = kind === "classes" ? "cette classe" : "cette matière";
    if (!window.confirm(`Voulez-vous vraiment supprimer ${label} : « ${name} » ? Cette action est irréversible.`)) return;
    await mutate(`/education/${kind}/${id}`, "DELETE");
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
                <div key={c.id} className="rounded-xl bg-gray-50 p-3">
                  {editingClassId === c.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); void saveClass(c.id); }} className="space-y-2">
                      <input aria-label="Nom de la classe" required maxLength={160} value={editClass.name}
                        onChange={(e) => setEditClass({ ...editClass, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 p-2 text-gray-900" />
                      <input aria-label="Niveau de la classe" maxLength={100} value={editClass.level}
                        onChange={(e) => setEditClass({ ...editClass, level: e.target.value })}
                        placeholder="Niveau" className="w-full rounded-lg border border-gray-300 p-2 text-gray-900" />
                      <div className="flex flex-wrap gap-2">
                        <button disabled={busy} type="submit" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Enregistrer</button>
                        <button disabled={busy} type="button" onClick={() => setEditingClassId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">Annuler</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.level ? `${c.level} · ` : ""}{c.student_count} élève(s)</p>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={busy} type="button"
                          onClick={() => { setMessage(""); setEditingClassId(c.id); setEditClass({ name: c.name, level: c.level || "" }); }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                          aria-label={`Modifier la classe ${c.name}`}>✎ Modifier</button>
                        <button disabled={busy} type="button" onClick={() => void removeItem("classes", c.id, c.name)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          aria-label={`Supprimer la classe ${c.name}`}>Supprimer</button>
                      </div>
                    </div>
                  )}
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
                <div key={s.id} className="rounded-xl bg-gray-50 p-3">
                  {editingSubjectId === s.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); void saveSubject(s.id); }} className="space-y-2">
                      <input aria-label="Nom de la matière" required maxLength={160} value={editSubject.name}
                        onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 p-2 text-gray-900" />
                      <input aria-label="Coefficient" type="number" min="0.5" max="20" step="0.5" required
                        value={editSubject.coefficient} onChange={(e) => setEditSubject({ ...editSubject, coefficient: e.target.value })}
                        className="w-28 rounded-lg border border-gray-300 p-2 text-gray-900" />
                      <div className="flex flex-wrap gap-2">
                        <button disabled={busy} type="submit" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Enregistrer</button>
                        <button disabled={busy} type="button" onClick={() => setEditingSubjectId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">Annuler</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-sm text-gray-500">Coef. {s.coefficient}</p>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={busy} type="button"
                          onClick={() => { setMessage(""); setEditingSubjectId(s.id); setEditSubject({ name: s.name, coefficient: String(s.coefficient) }); }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                          aria-label={`Modifier la matière ${s.name}`}>✎ Modifier</button>
                        <button disabled={busy} type="button" onClick={() => void removeItem("subjects", s.id, s.name)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          aria-label={`Supprimer la matière ${s.name}`}>Supprimer</button>
                      </div>
                    </div>
                  )}
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
