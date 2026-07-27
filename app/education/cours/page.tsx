"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, apiUrl } from "../../lib/api";

type ClassItem = { id: number; name: string };
type Subject = { id: number; name: string };
type Course = {
  id: number; class_id: number; subject_id: number | null; title: string; content: string | null;
  file_url: string | null; file_name: string | null; video_url: string | null; is_published: boolean;
  class_name: string; subject_name: string | null; teacher_name: string; created_at: string;
};

const inputCls = "w-full rounded-xl border border-gray-300 p-3 text-gray-900";

export default function EducationCoursesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ class_id: "", subject_id: "", title: "", content: "", video_url: "" });

  const load = useCallback(async (classId: string) => {
    const q = classId ? `?type=cours&class_id=${classId}` : "?type=cours";
    const res = await authFetch(`/education/courses${q}`);
    if (res.ok) setCourses(await res.json());
  }, []);

  useEffect(() => {
    authFetch("/education/classes").then(async (r) => r.ok && setClasses(await r.json()));
    authFetch("/education/subjects").then(async (r) => r.ok && setSubjects(await r.json()));
    load("");
  }, [load]);

  const publish = async () => {
    setMsg("");
    if (!form.class_id) return setMsg("Sélectionnez une classe.");
    if (!form.title.trim()) return setMsg("Le titre est requis.");
    setSaving(true);
    try {
      let file_url: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await authFetch("/education/courses/upload", { method: "POST", body: fd });
        if (!up.ok) { setSaving(false); const d = await up.json().catch(() => ({})); return setMsg(d?.error || "Échec du téléversement."); }
        const upData = await up.json();
        file_url = upData.file_url; file_name = upData.file_name;
      }
      const res = await authFetch("/education/courses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: Number(form.class_id), subject_id: form.subject_id ? Number(form.subject_id) : null,
          course_type: "cours", title: form.title, content: form.content || null,
          file_url, file_name, video_url: form.video_url || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaving(false); return setMsg(data?.error || "Erreur."); }
      setMsg("✅ Cours publié.");
      setForm({ class_id: form.class_id, subject_id: "", title: "", content: "", video_url: "" });
      setFile(null);
      await load(filterClass);
    } finally { setSaving(false); }
  };

  const togglePublish = async (c: Course) => {
    const res = await authFetch(`/education/courses/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !c.is_published }),
    });
    if (res.ok) await load(filterClass);
  };

  const remove = async (c: Course) => {
    if (!confirm(`Supprimer le cours « ${c.title} » ?`)) return;
    const res = await authFetch(`/education/courses/${c.id}`, { method: "DELETE" });
    if (res.ok) await load(filterClass);
    else setMsg("Erreur suppression.");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Cours en ligne</h1>
          <Link href="/education" className="font-bold text-blue-700">← Éducation</Link>
        </div>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-gray-900">Publier un cours</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Classe</label><select className={inputCls} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Choisir</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Matière</label><select className={inputCls} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}><option value="">(optionnel)</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-700">Titre</label><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Les fonctions dérivées" /></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-700">Contenu / description</label><textarea rows={3} className={inputCls} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Résumé de la leçon, consignes, plan…" /></div>
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Support (PDF, image, doc…)</label><input type="file" className="w-full text-sm text-gray-700" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <div><label className="mb-1 block text-sm font-semibold text-gray-700">Lien vidéo / visio</label><input className={inputCls} value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <button onClick={publish} disabled={saving} className="mt-4 rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">{saving ? "Publication…" : "Publier le cours"}</button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Cours publiés</h2>
            <select className="rounded-xl border border-gray-300 p-2 text-gray-900" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); load(e.target.value); }}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {courses.length === 0 ? (
            <p className="mt-3 text-gray-600">Aucun cours pour le moment.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {courses.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-gray-900">{c.title}
                        {!c.is_published && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600">Brouillon</span>}
                      </p>
                      <p className="text-xs text-gray-500">{c.class_name}{c.subject_name ? ` · ${c.subject_name}` : ""} · {c.teacher_name} · {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => togglePublish(c)} className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-bold text-gray-800 hover:bg-gray-300">{c.is_published ? "Dépublier" : "Publier"}</button>
                      <button onClick={() => remove(c)} className="rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200">Supprimer</button>
                    </div>
                  </div>
                  {c.content && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{c.content}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.file_url && <a href={apiUrl(c.file_url)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800">📎 {c.file_name || "Télécharger le support"}</a>}
                    {c.video_url && <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-purple-700 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800">▶ Vidéo / visio</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
