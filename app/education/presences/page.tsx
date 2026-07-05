"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type ClassItem = { id: number; name: string };
type Student = { id: number; first_name: string; last_name: string; matricule: string };
type Attendance = {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  class_name: string | null;
  status: string;
  check_in_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-800",
  retard: "bg-orange-100 text-orange-800",
  absent: "bg-red-100 text-red-800",
  absence_justifiee: "bg-blue-100 text-blue-800",
};

export default function EducationPresencesPage() {
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [rollCall, setRollCall] = useState<Record<number, string>>({});
  const [today, setToday] = useState<Attendance[]>([]);

  const loadToday = useCallback(async () => {
    const res = await authFetch("/education/attendance");
    if (res.ok) setToday(await res.json());
  }, []);

  useEffect(() => {
    authFetch("/education/classes").then(async (r) => r.ok && setClasses(await r.json()));
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (!selectedClass) return;
    authFetch(`/education/students?class_id=${selectedClass}`).then(async (r) => {
      if (r.ok) {
        const list: Student[] = await r.json();
        setStudents(list);
        setRollCall(Object.fromEntries(list.map((s) => [s.id, "present"])));
      }
    });
  }, [selectedClass]);

  const scan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanResult("");
    const res = await authFetch("/education/attendance/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_code: qrInput.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setScanResult(`❌ ${data?.error || "Erreur"}`);
    } else {
      setScanResult(
        `✅ ${data.student.first_name} ${data.student.last_name} — ${data.attendance?.status === "retard" ? "EN RETARD" : "présent(e)"}`
      );
    }
    setQrInput("");
    await loadToday();
  };

  const submitRollCall = async () => {
    const entries = Object.entries(rollCall).map(([student_id, status]) => ({
      student_id: Number(student_id),
      status,
    }));
    const res = await authFetch("/education/attendance/roll-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: Number(selectedClass), entries }),
    });
    const data = await res.json();
    setScanResult(res.ok ? `✅ Appel enregistré (${data.count} élèves)` : `❌ ${data?.error || "Erreur"}`);
    await loadToday();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Présences</h1>
          <Link href="/education" className="font-bold text-blue-700">← Education</Link>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Scan badge QR (entrée / tablette)</h2>
          <form onSubmit={scan} className="mt-3 flex gap-2">
            <input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Scanner ou saisir le code du badge (EDU-...)"
              className="flex-1 rounded-xl border border-gray-300 p-3 font-mono text-gray-900"
              autoFocus
            />
            <button type="submit" className="rounded-xl bg-yellow-500 px-6 font-black text-black">
              Valider
            </button>
          </form>
          {scanResult && <p className="mt-3 rounded-xl bg-gray-50 p-3 font-bold text-gray-900">{scanResult}</p>}
          <p className="mt-2 text-sm text-gray-500">
            Compatible lecteur QR physique (saisie clavier automatique) et scan caméra via la page Scanner.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Appel en classe</h2>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="mt-3 rounded-xl border border-gray-300 p-3 text-gray-900"
          >
            <option value="">Choisir une classe</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {students.length > 0 && (
            <>
              <div className="mt-4 space-y-2">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                    <div className="flex gap-1">
                      {["present", "retard", "absent"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setRollCall({ ...rollCall, [s.id]: st })}
                          className={`rounded-lg px-3 py-1 text-sm font-bold ${
                            rollCall[s.id] === st ? STATUS_COLORS[st] + " ring-2 ring-gray-900" : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {st === "present" ? "P" : st === "retard" ? "R" : "A"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={submitRollCall} className="mt-4 w-full rounded-xl bg-yellow-500 p-3 font-black text-black">
                Enregistrer l&apos;appel
              </button>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Aujourd&apos;hui ({today.length})</h2>
          <div className="mt-3 space-y-2">
            {today.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">
                  {a.first_name} {a.last_name}
                  <span className="ml-2 text-sm font-normal text-gray-500">{a.class_name || ""}</span>
                </p>
                <span className={`rounded-lg px-3 py-1 text-sm font-bold ${STATUS_COLORS[a.status] || "bg-gray-100"}`}>
                  {a.status}
                  {a.check_in_at ? ` · ${new Date(a.check_in_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </span>
              </div>
            ))}
            {today.length === 0 && <p className="text-gray-500">Aucun pointage aujourd&apos;hui.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
