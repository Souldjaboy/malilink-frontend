"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";

type ClassItem = { id: number; name: string };
type Subject = { id: number; name: string };
type Term = { id: number; label: string };
type Exam = { id: number; title: string; exam_type: string; class_name: string; subject_name: string; max_score: string; exam_date: string | null };
type Student = { id: number; first_name: string; last_name: string };

export default function EducationNotesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examForm, setExamForm] = useState({ class_id: "", subject_id: "", term_id: "", exam_type: "devoir", title: "", max_score: "20" });
  const [gradeExam, setGradeExam] = useState<Exam | null>(null);
  const [gradeStudents, setGradeStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [genForm, setGenForm] = useState({ class_id: "", term_id: "" });

  const load = useCallback(async () => {
    const [cRes, sRes, tRes, eRes] = await Promise.all([
      authFetch("/education/classes"),
      authFetch("/education/subjects"),
      authFetch("/education/terms"),
      authFetch("/education/exams"),
    ]);
    if (cRes.ok) setClasses(await cRes.json());
    if (sRes.ok) setSubjects(await sRes.json());
    if (tRes.ok) setTerms(await tRes.json());
    if (eRes.ok) setExams(await eRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await authFetch("/education/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: Number(examForm.class_id),
        subject_id: Number(examForm.subject_id),
        term_id: examForm.term_id ? Number(examForm.term_id) : undefined,
        exam_type: examForm.exam_type,
        title: examForm.title,
        max_score: Number(examForm.max_score) || 20,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error || "Erreur");
      return;
    }
    setExamForm({ ...examForm, title: "" });
    await load();
  };

  const openGrades = async (exam: Exam) => {
    setGradeExam(exam);
    setScores({});
    const cls = classes.find((c) => c.name === exam.class_name);
    if (!cls) return;
    const res = await authFetch(`/education/students?class_id=${cls.id}`);
    if (res.ok) setGradeStudents(await res.json());
  };

  const saveGrades = async () => {
    if (!gradeExam) return;
    const grades = Object.entries(scores)
      .filter(([, v]) => v !== "")
      .map(([student_id, score]) => ({ student_id: Number(student_id), score: Number(score) }));
    const res = await authFetch(`/education/exams/${gradeExam.id}/grades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grades }),
    });
    const data = await res.json();
    setMessage(res.ok ? `✅ ${data.count} note(s) enregistrée(s)` : `❌ ${data?.error || "Erreur"}`);
    setGradeExam(null);
  };

  const generateReportCards = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await authFetch("/education/report-cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: Number(genForm.class_id), term_id: Number(genForm.term_id) }),
    });
    const data = await res.json();
    setMessage(res.ok ? `✅ ${data.generated} bulletin(s) généré(s) avec moyennes et rangs` : `❌ ${data?.error || "Erreur"}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Notes & bulletins</h1>
          <Link href="/education" className="font-bold text-blue-700">← Education</Link>
        </div>

        {message && <p className="rounded-xl bg-blue-50 p-3 font-semibold text-blue-800">{message}</p>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Nouvelle évaluation</h2>
          <form onSubmit={createExam} className="mt-3 grid gap-3 md:grid-cols-6">
            <select value={examForm.class_id} onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })} required className="rounded-xl border border-gray-300 p-3 text-gray-900">
              <option value="">Classe</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={examForm.subject_id} onChange={(e) => setExamForm({ ...examForm, subject_id: e.target.value })} required className="rounded-xl border border-gray-300 p-3 text-gray-900">
              <option value="">Matière</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={examForm.term_id} onChange={(e) => setExamForm({ ...examForm, term_id: e.target.value })} className="rounded-xl border border-gray-300 p-3 text-gray-900">
              <option value="">Période</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })} className="rounded-xl border border-gray-300 p-3 text-gray-900">
              <option value="devoir">Devoir</option>
              <option value="interrogation">Interrogation</option>
              <option value="examen">Examen</option>
              <option value="composition">Composition</option>
            </select>
            <input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="Titre" required className="rounded-xl border border-gray-300 p-3 text-gray-900" />
            <button type="submit" className="rounded-xl bg-yellow-500 p-3 font-black text-black">+ Créer</button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Évaluations récentes</h2>
          <div className="mt-3 space-y-2">
            {exams.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <p className="font-semibold text-gray-900">
                  {ex.title}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {ex.class_name} · {ex.subject_name} · /{ex.max_score}
                  </span>
                </p>
                <button onClick={() => openGrades(ex)} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white">
                  Saisir les notes
                </button>
              </div>
            ))}
            {exams.length === 0 && <p className="text-gray-500">Aucune évaluation.</p>}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-black text-gray-900">Générer les bulletins</h2>
          <p className="mt-1 text-sm text-gray-500">Calcule moyennes, rangs, absences et retards pour toute la classe.</p>
          <form onSubmit={generateReportCards} className="mt-3 flex flex-wrap gap-3">
            <select value={genForm.class_id} onChange={(e) => setGenForm({ ...genForm, class_id: e.target.value })} required className="rounded-xl border border-gray-300 p-3 text-gray-900">
              <option value="">Classe</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={genForm.term_id} onChange={(e) => setGenForm({ ...genForm, term_id: e.target.value })} required className="rounded-xl border border-gray-300 p-3 text-gray-900">
              <option value="">Période</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button type="submit" className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black">
              Générer
            </button>
          </form>
        </section>

        {gradeExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setGradeExam(null)}>
            <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-black text-gray-900">{gradeExam.title} (/{gradeExam.max_score})</h3>
              <div className="mt-4 space-y-2">
                {gradeStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                    <input
                      type="number"
                      min="0"
                      max={Number(gradeExam.max_score)}
                      step="0.25"
                      value={scores[s.id] ?? ""}
                      onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                      className="w-24 rounded-xl border border-gray-300 p-2 text-right text-gray-900"
                    />
                  </div>
                ))}
              </div>
              <button onClick={saveGrades} className="mt-4 w-full rounded-xl bg-yellow-500 p-3 font-black text-black">
                Enregistrer les notes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
