"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type Student = {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  class_id: number | null;
  class_name: string | null;
  status: string;
};

type ClassItem = { id: number; name: string };

type Badge = {
  matricule: string;
  first_name: string;
  last_name: string;
  qr_data_url: string;
};

export default function EducationElevesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", gender: "", birth_date: "", class_id: "" });
  const [badge, setBadge] = useState<Badge | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const url = filterClass ? `/education/students?class_id=${filterClass}` : "/education/students";
    const [sRes, cRes] = await Promise.all([authFetch(url), authFetch("/education/classes")]);
    if (sRes.ok) setStudents(await sRes.json());
    if (cRes.ok) setClasses(await cRes.json());
  }, [filterClass]);

  useEffect(() => {
    load();
  }, [load]);

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await authFetch("/education/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        gender: form.gender || undefined,
        birth_date: form.birth_date || undefined,
        class_id: form.class_id ? Number(form.class_id) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error || "Erreur");
      return;
    }
    setMessage(`Élève créé — matricule ${data.matricule}, badge QR généré automatiquement.`);
    setForm({ first_name: "", last_name: "", gender: "", birth_date: "", class_id: "" });
    await load();
  };

  const showBadge = async (id: number) => {
    const res = await authFetch(`/education/students/${id}/badge`);
    if (res.ok) setBadge(await res.json());
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Élèves</h1>
          <Link href="/education" className="font-bold text-blue-700">← Education</Link>
        </div>

        <form onSubmit={createStudent} className="grid gap-3 rounded-2xl bg-white p-6 shadow md:grid-cols-6">
          <input
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="Prénom"
            required
            className="rounded-xl border border-gray-300 p-3 text-gray-900"
          />
          <input
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder="Nom"
            required
            className="rounded-xl border border-gray-300 p-3 text-gray-900"
          />
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="rounded-xl border border-gray-300 p-3 text-gray-900"
          >
            <option value="">Sexe</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            className="rounded-xl border border-gray-300 p-3 text-gray-900"
          />
          <select
            value={form.class_id}
            onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            className="rounded-xl border border-gray-300 p-3 text-gray-900"
          >
            <option value="">Classe</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-yellow-500 p-3 font-black text-black">
            + Inscrire
          </button>
        </form>

        {message && <p className="rounded-xl bg-blue-50 p-3 font-semibold text-blue-800">{message}</p>}

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900">{students.length} élève(s)</h2>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="rounded-xl border border-gray-300 p-2 text-gray-900"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="p-2">Matricule</th>
                  <th className="p-2">Nom</th>
                  <th className="p-2">Classe</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Badge</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 font-mono text-sm text-gray-700">{s.matricule}</td>
                    <td className="p-2 font-semibold text-gray-900">{s.first_name} {s.last_name}</td>
                    <td className="p-2 text-gray-700">{s.class_name || "—"}</td>
                    <td className="p-2 text-gray-700">{s.status}</td>
                    <td className="p-2">
                      <button onClick={() => showBadge(s.id)} className="rounded-lg bg-gray-900 px-3 py-1 text-sm font-bold text-white">
                        QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {badge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBadge(null)}>
            <div className="rounded-2xl bg-white p-8 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-black text-gray-900">{badge.first_name} {badge.last_name}</h3>
              <p className="font-mono text-gray-600">{badge.matricule}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={badge.qr_data_url} alt="Badge QR" className="mx-auto mt-4 h-64 w-64" />
              <div className="mt-4 flex justify-center gap-3">
                <button onClick={() => window.print()} className="rounded-xl bg-yellow-500 px-5 py-2 font-black text-black">
                  Imprimer
                </button>
                <button onClick={() => setBadge(null)} className="rounded-xl bg-gray-200 px-5 py-2 font-bold text-gray-800">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
