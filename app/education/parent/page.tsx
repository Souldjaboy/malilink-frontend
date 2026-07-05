"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

type Child = { id: number; first_name: string; last_name: string; matricule: string; class_name: string | null };
type Attendance = { id: number; attendance_date: string; status: string };
type Averages = { subjects: { subject_name: string; coefficient: string; subject_average: number | null }[]; general_average: number | null };
type ReportCard = { id: number; term_label: string; general_average: string | null; rank_in_class: number | null; class_size: number | null; absences_count: number; late_count: number };
type Finance = { fees: { id: number; label: string; remaining: string }[] };

export default function EducationParentPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<Child | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [averages, setAverages] = useState<Averages | null>(null);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [finance, setFinance] = useState<Finance | null>(null);

  useEffect(() => {
    authFetch("/education/students").then(async (r) => {
      if (r.ok) {
        const list = await r.json();
        setChildren(list);
        if (list.length > 0) setSelected(list[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    Promise.all([
      authFetch(`/education/attendance?student_id=${selected.id}`),
      authFetch(`/education/students/${selected.id}/averages`),
      authFetch(`/education/students/${selected.id}/report-cards`),
      authFetch(`/education/students/${selected.id}/finances`),
    ]).then(async ([aRes, avRes, rRes, fRes]) => {
      if (aRes.ok) setAttendance(await aRes.json());
      if (avRes.ok) setAverages(await avRes.json());
      if (rRes.ok) setReportCards(await rRes.json());
      if (fRes.ok) setFinance(await fRes.json());
    });
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Espace parent</h1>
          <Link href="/education" className="font-bold text-blue-700">← Education</Link>
        </div>

        {children.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-gray-600 shadow">
            Aucun enfant lié à votre compte. Demandez à l&apos;école de lier votre compte parent.
          </p>
        )}

        {children.length > 1 && (
          <div className="flex gap-2">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`rounded-xl px-4 py-2 font-bold ${
                  selected?.id === c.id ? "bg-yellow-500 text-black" : "bg-white text-gray-700"
                }`}
              >
                {c.first_name}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow">
              <h2 className="text-2xl font-black">{selected.first_name} {selected.last_name}</h2>
              <p className="text-white/70">
                {selected.class_name || "Classe non affectée"} · {selected.matricule}
              </p>
              {averages?.general_average != null && (
                <p className="mt-3 text-3xl font-black text-yellow-400">
                  Moyenne générale : {averages.general_average}/20
                </p>
              )}
            </div>

            <section className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-xl font-black text-gray-900">Moyennes par matière</h3>
              <div className="mt-3 space-y-2">
                {averages?.subjects.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">
                      {s.subject_name} <span className="text-sm font-normal text-gray-500">(coef. {s.coefficient})</span>
                    </p>
                    <p className="font-black text-gray-900">{s.subject_average != null ? `${s.subject_average}/20` : "—"}</p>
                  </div>
                ))}
                {(!averages || averages.subjects.length === 0) && <p className="text-gray-500">Pas encore de notes.</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-xl font-black text-gray-900">Bulletins</h3>
              <div className="mt-3 space-y-2">
                {reportCards.map((rc) => (
                  <div key={rc.id} className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900">{rc.term_label}</p>
                      <p className="font-black text-gray-900">
                        {rc.general_average != null ? `${Number(rc.general_average).toFixed(2)}/20` : "—"}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {rc.rank_in_class ? `Rang : ${rc.rank_in_class}/${rc.class_size}` : ""} ·
                      {" "}{rc.absences_count} absence(s) · {rc.late_count} retard(s)
                    </p>
                  </div>
                ))}
                {reportCards.length === 0 && <p className="text-gray-500">Aucun bulletin disponible.</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-xl font-black text-gray-900">Présences récentes</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {attendance.slice(0, 20).map((a) => (
                  <span
                    key={a.id}
                    className={`rounded-lg px-3 py-1 text-sm font-bold ${
                      a.status === "present"
                        ? "bg-green-100 text-green-800"
                        : a.status === "retard"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {new Date(a.attendance_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · {a.status}
                  </span>
                ))}
                {attendance.length === 0 && <p className="text-gray-500">Aucun pointage enregistré.</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-xl font-black text-gray-900">Paiements</h3>
              <div className="mt-3 space-y-2">
                {finance?.fees.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">{f.label}</p>
                    <p className={`font-black ${Number(f.remaining) > 0 ? "text-red-600" : "text-green-600"}`}>
                      {Number(f.remaining) > 0 ? `Reste ${formatFCFA(Number(f.remaining))}` : "Soldé ✓"}
                    </p>
                  </div>
                ))}
                {(!finance || finance.fees.length === 0) && <p className="text-gray-500">Aucun frais.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
