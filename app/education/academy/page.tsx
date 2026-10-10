"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "../../lib/api";
import AcademyAccess from "../AcademyAccess";

type Question = { prompt: string; choices: string[]; answer?: number; explanation?: string };
type Resource = { type: "file" | "video" | "link"; title: string; asset_id?: number; url?: string };
type Unit = { course_id: number; questions: Question[]; resources?: Resource[]; title?: string; lesson?: { title: string; content: string }; locked?: boolean; passed?: boolean; attempt_limit?: number; attempts?: { id: number; score: number | null; submitted_at: string | null }[] };
type Certificate = { id: number; verification_token: string; issued_at: string };
type Program = { id: number; title: string; description: string; class_id: number; threshold: number; max_attempts: number; published: boolean; staff?: boolean; can_manage?: boolean; units?: Unit[]; lesson_count?: number; certificate?: Certificate | null };
type Report = { id: number; first_name: string; last_name: string; user_id: number | null; email: string | null; is_active: boolean | null; attempts: number; passed_units: number; last_activity: string | null };
type AcademySettings = { brand_name: string; welcome_text: string; primary_color: string; celebration_enabled: boolean };
type Result = { score: number; passed: boolean; feedback: { correct: boolean; explanation: string }[] };
async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await authFetch(path, { method, cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || "Opération impossible."); return data;
}
async function download(path: string, filename: string) {
  const response = await authFetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Téléchargement impossible.");
  const url = URL.createObjectURL(await response.blob()), link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
const base = "/education/learning";
const button = "rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900";

export default function AcademyPage() {
  const [data, setData] = useState<{ staff: boolean; can_manage: boolean; programs: Program[]; settings: AcademySettings } | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null), [creating, setCreating] = useState(false), [configuring, setConfiguring] = useState(false);
  async function load() { try { setData(await api(`${base}/programs`)); setError(""); } catch (e) { setData(null); setError((e as Error).message); } }
  useEffect(() => { let alive = true; api<{ staff: boolean; can_manage: boolean; programs: Program[]; settings: AcademySettings }>(`${base}/programs`).then(d => { if (alive) { setData(d); const requested = Number(new URLSearchParams(window.location.search).get("program")); if (Number.isInteger(requested) && requested > 0) setSelected(requested); } }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, []);
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-5xl space-y-5">
    <Link href="/education" className="text-sm underline">Retour à Éducation</Link>
    <header className="rounded-3xl p-6 text-white" style={{ backgroundColor: data?.settings.primary_color || "#0f172a" }}><p className="text-amber-300">APPRENDRE · PRATIQUER · PROGRESSER</p><h1 className="mt-2 text-3xl font-bold text-white">{data?.settings.brand_name || "MaliLink Academy"}</h1><p className="mt-2 text-white/80">{data?.settings.welcome_text || "Votre espace de formation, au rythme de vos acquis."}</p></header>
    <AcademyAccess managementOnly />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {!data && !error && <p role="status">Chargement de votre espace…</p>}
    {data && <><div className="flex flex-wrap gap-3"><button className={button} onClick={() => { setSelected(null); setCreating(false); setConfiguring(false); void load(); }}>Mes parcours</button>{data.staff && <button className={button} onClick={() => { setSelected(null); setConfiguring(false); setCreating(true); }}>Créer un parcours</button>}{data.can_manage && <button className={button} onClick={() => { setSelected(null); setCreating(false); setConfiguring(true); }}>Personnaliser Academy</button>}</div>
      {configuring ? <SettingsEditor initial={data.settings} onSaved={() => { setConfiguring(false); void load(); }} /> : creating ? <Editor key="new" onSaved={id => { setCreating(false); setSelected(id); void load(); }} /> : selected ? <ProgramView key={selected} id={selected} /> : <div className="grid gap-4 md:grid-cols-2">
        {!data.programs.length && <p>Aucun parcours disponible. {data.staff ? "Créez d'abord vos cours dans Éducation, puis assemblez votre premier parcours." : "Votre professeur publiera les parcours de votre classe ici."}</p>}
        {data.programs.map(p => <button key={p.id} onClick={() => setSelected(p.id)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"><p className="text-sm text-slate-600">{p.published ? "Publié" : "Brouillon"} · {p.lesson_count} leçons</p><h2 className="mt-2 break-words text-xl font-bold text-slate-900">{p.title}</h2><p className="mt-2 break-words text-slate-600">{p.description}</p><p className="mt-3 font-semibold">Ouvrir le parcours →</p></button>)}
      </div>}
    </>}
  </div></main>;
}

function ProgramView({ id }: { id: number }) {
  const [p, setP] = useState<Program | null>(null), [error, setError] = useState("");
  const [editing, setEditing] = useState(false), [report, setReport] = useState<Report[] | null>(null), [busy, setBusy] = useState(false);
  async function refresh() { try { setP(await api(`${base}/programs/${id}`)); } catch (e) { setP(null); setError((e as Error).message); } }
  useEffect(() => { let alive = true; api<Program>(`${base}/programs/${id}`).then(d => { if (alive) setP(d); }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [id]);
  async function publish() { setBusy(true); try { await api(`${base}/programs/${id}/publish`, "POST", {}); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function action(path: string, method: string) { setBusy(true); try { const result = await api<{ id?: number }>(path, method, {}); if (result.id) window.location.href = `/education/academy?program=${result.id}`; else window.location.href = "/education/academy"; } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  if (editing && p) return <Editor initial={p} onSaved={() => { setEditing(false); void refresh(); }} />;
  return <section className="space-y-4">{error && <p role="alert" className="text-red-800">{error}</p>}{p && <>
    <h2 className="break-words text-2xl font-bold text-slate-900">{p.title}</h2><p>{p.description}</p>
    <p>Validation à {p.threshold} % · {p.max_attempts} tentatives par leçon</p>
    {p.staff ? <><div className="flex flex-wrap gap-3">{!p.published && <><button onClick={() => setEditing(true)} className={button}>Modifier le brouillon</button><button disabled={busy} onClick={publish} className={button}>Publier et figer les leçons</button></>}<button className={button} onClick={async () => { try { setReport(await api(`${base}/programs/${id}/report`)); } catch (e) { setError((e as Error).message); } }}>Suivi des élèves</button><button disabled={busy} className={button} onClick={() => void action(`${base}/programs/${id}/duplicate`, "POST")}>Dupliquer</button><button disabled={busy} className="rounded-xl border border-red-300 px-4 py-3 font-semibold text-red-800" onClick={() => { if (window.confirm("Archiver ce parcours ? Les résultats seront conservés.")) void action(`${base}/programs/${id}/archive`, "PUT"); }}>Archiver</button></div>
      <p className="text-sm text-slate-600">La publication conserve une copie du texte des cours et du quiz. Les modifications ultérieures des cours ne changent pas les résultats déjà obtenus. Aucun résultat n&apos;est envoyé automatiquement au bulletin.</p>
      {p.units?.map((u, i) => <div key={i} className="rounded-xl bg-white p-4"><h3 className="font-bold">Leçon {i + 1} — {u.lesson?.title || `Cours n° ${u.course_id}`}</h3><p>{u.questions.length} questions</p></div>)}
      {report && <div className="overflow-x-auto rounded-xl bg-white"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Élève</th><th className="p-3">Leçons validées</th><th className="p-3">Tentatives</th><th className="p-3">Compte</th></tr></thead><tbody>{report.map(r => <tr key={r.id}><td className="p-3">{r.first_name} {r.last_name}</td><td className="p-3">{r.passed_units} / {p.units?.length}</td><td className="p-3">{r.attempts}</td><td className="p-3">{p.can_manage ? <StudentAccount student={r} onChanged={async () => setReport(await api(`${base}/programs/${id}/report`))} /> : r.user_id ? (r.is_active ? "Actif" : "Bloqué") : "Non créé"}</td></tr>)}</tbody></table>{!report.length && <p className="p-4">Aucun élève dans cette classe.</p>}</div>}
      {report && p.published && <RetryAllowance program={p} students={report} />}
    </> : <><p className="font-semibold">{p.units?.filter(u => u.passed).length} / {p.units?.length} leçons validées</p><progress className="w-full" aria-label="Progression" max={p.units?.length || 1} value={p.units?.filter(u => u.passed).length || 0} />
      {p.certificate && <button className={button} onClick={async () => { try { await download(`${base}/programs/${id}/certificate.pdf`, `attestation-${p.title}.pdf`); } catch (e) { setError((e as Error).message); } }}>Télécharger mon attestation PDF</button>}
      {p.units?.map((u, i) => <Lesson key={`${id}-${i}`} unit={u} index={i} programId={id} maxAttempts={p.max_attempts} onSubmitted={refresh} />)}
    </>}
  </>}</section>;
}

function Lesson({ unit, index, programId, maxAttempts, onSubmitted }: { unit: Unit; index: number; programId: number; maxAttempts: number; onSubmitted: () => Promise<void> }) {
  const [answers, setAnswers] = useState<number[]>(unit.questions.map(() => -1)), [result, setResult] = useState<Result | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [sound, setSound] = useState(false);
  const exhausted = (unit.attempts?.length || 0) >= (unit.attempt_limit || maxAttempts) && !unit.attempts?.some(a => !a.submitted_at);
  async function submit() {
    setBusy(true); setError(""); let audio: AudioContext | undefined;
    if (sound) { try { audio = new AudioContext(); await audio.resume(); } catch { /* optional sound */ } }
    try {
      const attempt = await api<{ id: number }>(`${base}/programs/${programId}/start`, "POST", { unit_index: index });
      const response = await api<Result>(`${base}/attempts/${attempt.id}/submit`, "POST", { answers }); setResult(response);
      if (response.passed && audio) { const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.connect(gain); gain.connect(audio.destination); gain.gain.value = 0.06; oscillator.frequency.setValueAtTime(523, audio.currentTime); oscillator.frequency.setValueAtTime(659, audio.currentTime + .15); oscillator.frequency.setValueAtTime(784, audio.currentTime + .3); oscillator.start(); oscillator.stop(audio.currentTime + .5); const context = audio; oscillator.onended = () => { void context.close(); }; audio = undefined; }
      await onSubmitted();
    } catch (e) { setError((e as Error).message); } finally { if (audio) void audio.close(); setBusy(false); }
  }
  return <article className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="break-words text-lg font-bold text-slate-900">{unit.passed ? "🏅" : unit.locked ? "🔒" : "📖"} Leçon {index + 1} — {unit.title}</h3>
    {unit.locked ? <p>Validez la leçon précédente pour continuer.</p> : <><p className="whitespace-pre-wrap break-words leading-relaxed">{unit.lesson?.content || "Consultez l'explication de votre professeur."}</p>
      {!!unit.resources?.length && <div className="grid gap-2 sm:grid-cols-2">{unit.resources.map((resource, ri) => resource.type === "file" ? <button type="button" className="rounded-xl border border-slate-300 p-3 text-left font-semibold" key={ri} onClick={async () => { try { await download(resource.url || "", resource.title); } catch (e) { setError((e as Error).message); } }}>📎 {resource.title}</button> : <a key={ri} className="rounded-xl border border-slate-300 p-3 font-semibold" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.type === "video" ? "🎬" : "🔗"} {resource.title}</a>)}</div>}
      {unit.passed ? <p className="font-semibold text-green-800">Compétence validée — médaille de cette leçon obtenue.</p> : <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-5">
        {unit.questions.map((q, qi) => <fieldset key={qi} disabled={busy || exhausted} className="min-w-0 rounded-xl bg-slate-50 p-4"><legend className="break-words font-semibold">{qi + 1}. {q.prompt}</legend>{q.choices.map((c, ci) => <label key={ci} className="my-2 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"><input type="radio" required name={`q-${programId}-${index}-${qi}`} checked={answers[qi] === ci} onChange={() => setAnswers(old => { const next = [...old]; next[qi] = ci; return next; })} /><span className="min-w-0 break-words">{c}</span></label>)}</fieldset>)}
        <label className="flex items-center gap-2"><input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} />Jouer un son discret en cas de réussite</label>
        <button disabled={busy || exhausted} className={button}>{busy ? "Correction…" : "Valider mes réponses"}</button>
        {exhausted && <p className="text-amber-800">Tentatives épuisées : contactez votre professeur pour revoir les notions.</p>}
      </form>}
      {result && <div role="status" className={`rounded-xl p-4 ${result.passed ? "bg-green-50 text-green-900 motion-safe:animate-pulse" : "bg-amber-50 text-amber-900"}`}><p className="font-bold">{result.passed ? "🏅 Félicitations !" : "Continuez vos efforts."} Résultat : {result.score} %.</p>{result.feedback.map((f, i) => <p key={i}>Question {i + 1} : {f.correct ? "correct" : "à revoir"}. {f.explanation}</p>)}</div>}
      {!!unit.attempts?.length && <p className="text-sm text-slate-600">Résultats précédents : {unit.attempts.map(a => a.submitted_at ? `${a.score} %` : "en cours").join(" · ")}</p>}
    </>}{error && <p role="alert" className="text-red-800">{error}</p>}
  </article>;
}

function SettingsEditor({ initial, onSaved }: { initial: AcademySettings; onSaved: () => void }) {
  const [value, setValue] = useState(initial), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  return <form className="space-y-4 rounded-2xl bg-white p-5" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(""); try { await api(`${base}/settings`, "PUT", value); onSaved(); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }}>
    <h2 className="text-xl font-bold">Personnaliser votre Academy</h2>
    <label className="block">Nom affiché<input required maxLength={100} className={input} value={value.brand_name} onChange={event => setValue(old => ({ ...old, brand_name: event.target.value }))} /></label>
    <label className="block">Message d&apos;accueil<textarea maxLength={500} className={input} value={value.welcome_text} onChange={event => setValue(old => ({ ...old, welcome_text: event.target.value }))} /></label>
    <label className="block">Couleur principale<input type="color" className="h-12 w-24 rounded border" value={value.primary_color} onChange={event => setValue(old => ({ ...old, primary_color: event.target.value }))} /></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={value.celebration_enabled} onChange={event => setValue(old => ({ ...old, celebration_enabled: event.target.checked }))} />Activer les célébrations de réussite</label>
    <button disabled={busy} className={button}>{busy ? "Enregistrement…" : "Enregistrer"}</button>{message && <p role="alert">{message}</p>}
  </form>;
}

function StudentAccount({ student, onChanged }: { student: Report; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  if (student.user_id) return <div className="flex min-w-40 flex-col gap-2"><span>{student.email}<br />{student.is_active ? "Actif" : "Bloqué"}</span><button disabled={busy} className="underline" onClick={async () => { setBusy(true); try { await api(`${base}/students/${student.id}/account/status`, "PUT", { is_active: !student.is_active }); await onChanged(); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }}>{student.is_active ? "Bloquer" : "Réactiver"}</button>{message && <span className="text-red-700">{message}</span>}</div>;
  if (!editing) return <button className="underline" onClick={() => setEditing(true)}>Créer le compte</button>;
  return <form className="min-w-64 space-y-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(""); try { await api(`${base}/students/${student.id}/account`, "POST", { email, password }); setEditing(false); setPassword(""); await onChanged(); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }}>
    <input required type="email" className={input} placeholder="Email de connexion" value={email} onChange={event => setEmail(event.target.value)} />
    <input required type="password" minLength={8} className={input} placeholder="Mot de passe temporaire" value={password} onChange={event => setPassword(event.target.value)} />
    <p className="text-xs">Au moins 8 caractères, une lettre et un chiffre. L&apos;élève devra le modifier.</p><button disabled={busy} className={button}>Créer</button>{message && <p className="text-red-700">{message}</p>}
  </form>;
}

function RetryAllowance({ program, students }: { program: Program; students: Report[] }) {
  const [student, setStudent] = useState(0), [unit, setUnit] = useState(0), [limit, setLimit] = useState(Math.min(20, program.max_attempts + 1));
  const [reason, setReason] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMessage("");
    try { await api(`${base}/programs/${program.id}/allowance`, "PUT", { student_id: student, unit_index: unit, attempt_limit: limit, reason }); setMessage("Autorisation enregistrée. Les résultats précédents sont conservés."); }
    catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  return <form className="space-y-3 rounded-xl bg-white p-4" onSubmit={e => { e.preventDefault(); void save(); }}>
    <h3 className="font-bold">Autoriser de nouvelles tentatives</h3>
    <label className="block">Élève<select required className={input} value={student || ""} onChange={e => setStudent(Number(e.target.value))}><option value="">Choisir</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></label>
    <label className="block">Leçon<select className={input} value={unit} onChange={e => setUnit(Number(e.target.value))}>{program.units?.map((u, i) => <option key={i} value={i}>{i + 1}. {u.lesson?.title}</option>)}</select></label>
    <label className="block">Nouveau total autorisé, anciens essais compris<input required type="number" min={program.max_attempts} max={20} className={input} value={limit} onChange={e => setLimit(Number(e.target.value))} /></label>
    <label className="block">Justification<textarea required maxLength={500} className={input} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <button disabled={busy} className={button}>Enregistrer cette autorisation</button>{message && <p role="status">{message}</p>}
  </form>;
}

function ResourceEditor({ resources, onChange }: { resources: Resource[]; onChange: (resources: Resource[]) => void }) {
  const [title, setTitle] = useState(""), [url, setUrl] = useState(""), [type, setType] = useState<"video" | "link">("video"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function uploadFile(file?: File) {
    if (!file) return; setBusy(true); setError("");
    try { const form = new FormData(); form.append("file", file); const response = await authFetch(`${base}/assets`, { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Envoi impossible."); onChange([...resources, { type: "file", title: file.name, asset_id: data.id }]); }
    catch (uploadError) { setError((uploadError as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-3"><h4 className="font-semibold">Documents, audio, vidéo et liens</h4>
    {resources.map((resource, index) => <div key={`${resource.type}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2"><span className="min-w-0 break-words">{resource.type === "file" ? "📎" : resource.type === "video" ? "🎬" : "🔗"} {resource.title}</span><button type="button" className="text-red-800 underline" onClick={() => onChange(resources.filter((_, i) => i !== index))}>Retirer</button></div>)}
    <label className="block">Importer un fichier privé (PDF, image, audio, vidéo, Word ou PowerPoint — 50 Mo maximum)<input disabled={busy || resources.length >= 12} type="file" accept=".pdf,.jpg,.jpeg,.png,.mp3,.m4a,.mp4,.webm,.docx,.pptx" className={input} onChange={event => { void uploadFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
    <div className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]"><select className={input} value={type} onChange={event => setType(event.target.value as "video" | "link")}><option value="video">Vidéo/visio</option><option value="link">Lien HTTPS</option></select><input className={input} maxLength={160} placeholder="Titre" value={title} onChange={event => setTitle(event.target.value)} /><input className={input} type="url" placeholder="https://…" value={url} onChange={event => setUrl(event.target.value)} /><button type="button" className={button} disabled={!title.trim() || !url.startsWith("https://") || resources.length >= 12} onClick={() => { onChange([...resources, { type, title: title.trim(), url }]); setTitle(""); setUrl(""); }}>Ajouter</button></div>
    {busy && <p role="status">Téléversement sécurisé…</p>}{error && <p role="alert" className="text-red-800">{error}</p>}
  </div>;
}

function Editor({ initial, onSaved }: { initial?: Program; onSaved: (id: number) => void }) {
  const [title, setTitle] = useState(initial?.title || ""), [description, setDescription] = useState(initial?.description || "");
  const [classId, setClassId] = useState(initial?.class_id || 0), [threshold, setThreshold] = useState(initial?.threshold || 70), [attempts, setAttempts] = useState(initial?.max_attempts || 3);
  const [units, setUnits] = useState<Unit[]>(initial?.units || []), [classes, setClasses] = useState<{ id: number; name: string }[]>([]), [courses, setCourses] = useState<{ id: number; title: string; class_id: number; is_published: boolean }[]>([]);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; Promise.all([api<typeof classes>("/education/classes"), api<typeof courses>("/education/courses")]).then(([c, l]) => { if (alive) { setClasses(c); setCourses(l); } }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, []);
  function changeQuestion(ui: number, qi: number, field: Partial<Question>) { setUnits(old => old.map((u, i) => i !== ui ? u : { ...u, questions: u.questions.map((q, j) => j !== qi ? q : { ...q, ...field }) })); }
  async function save() { setBusy(true); setError(""); try { const p = await api<{ id: number }>(`${base}/programs${initial ? `/${initial.id}` : ""}`, initial ? "PUT" : "POST", { title, description, class_id: classId, threshold, max_attempts: attempts, units }); onSaved(p.id); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const question = (): Question => ({ prompt: "", choices: ["", "", ""], answer: 0, explanation: "" });
  return <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-5 rounded-2xl bg-white p-5"><h2 className="text-xl font-bold text-slate-900">Préparer un parcours</h2>
    <p className="text-sm">Le texte vient de vos cours existants. <Link href="/education/cours" className="underline">Créer ou modifier les cours</Link>. Ajoutez ensuite des documents privés ou des liens HTTPS dans chaque leçon.</p>
    <label className="block">Titre<input required maxLength={160} className={input} value={title} onChange={e => setTitle(e.target.value)} /></label>
    <label className="block">Présentation<textarea maxLength={3000} className={input} value={description} onChange={e => setDescription(e.target.value)} /></label>
    <label className="block">Classe<select required className={input} value={classId || ""} onChange={e => { setClassId(Number(e.target.value)); setUnits([]); }}><option value="">Choisir une classe</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-2"><label>Seuil de réussite (%)<input type="number" min={1} max={100} required className={input} value={threshold} onChange={e => setThreshold(Number(e.target.value))} /></label><label>Tentatives par leçon<input type="number" min={1} max={20} required className={input} value={attempts} onChange={e => setAttempts(Number(e.target.value))} /></label></div>
    {units.map((u, ui) => <section key={ui} className="space-y-3 rounded-xl border border-slate-200 p-3"><h3 className="font-bold">Leçon {ui + 1}</h3><select required aria-label={`Cours de la leçon ${ui + 1}`} className={input} value={u.course_id || ""} onChange={e => setUnits(old => old.map((v, i) => i === ui ? { ...v, course_id: Number(e.target.value) } : v))}><option value="">Choisir un cours publié</option>{courses.filter(c => c.class_id === classId && c.is_published).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <ResourceEditor resources={u.resources || []} onChange={resources => setUnits(old => old.map((value, i) => i === ui ? { ...value, resources } : value))} />
      {u.questions.map((q, qi) => <fieldset key={qi} className="min-w-0 space-y-2 rounded-xl bg-slate-50 p-3"><legend>Question {qi + 1}</legend><input aria-label="Énoncé" placeholder="Votre question" required maxLength={1000} className={input} value={q.prompt} onChange={e => changeQuestion(ui, qi, { prompt: e.target.value })} />
        {q.choices.map((c, ci) => <label key={ci} className="flex items-center gap-2"><input aria-label={`Bonne réponse : choix ${ci + 1}`} type="radio" name={`answer-${ui}-${qi}`} checked={q.answer === ci} onChange={() => changeQuestion(ui, qi, { answer: ci })} /><input required aria-label={`Choix ${ci + 1}`} maxLength={500} className={input} value={c} onChange={e => changeQuestion(ui, qi, { choices: q.choices.map((v, i) => i === ci ? e.target.value : v) })} /></label>)}
        <label className="block">Explication après correction<textarea className={input} maxLength={1500} value={q.explanation || ""} onChange={e => changeQuestion(ui, qi, { explanation: e.target.value })} /></label>
        {u.questions.length > 1 && <button type="button" className="text-red-800 underline" onClick={() => setUnits(old => old.map((v, i) => i === ui ? { ...v, questions: v.questions.filter((_, j) => j !== qi) } : v))}>Retirer cette question</button>}
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={u.questions.length >= 30} className={button} onClick={() => setUnits(old => old.map((v, i) => i === ui ? { ...v, questions: [...v.questions, question()] } : v))}>Ajouter une question</button><button type="button" className="text-red-800 underline" onClick={() => setUnits(old => old.filter((_, i) => i !== ui))}>Retirer la leçon</button></div>
    </section>)}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={!classId || units.length >= 50} className={button} onClick={() => setUnits(old => [...old, { course_id: 0, resources: [], questions: [question()] }])}>Ajouter une leçon</button><button disabled={busy || !units.length} className={button}>{busy ? "Enregistrement…" : "Enregistrer le brouillon"}</button></div>
    {error && <p role="alert" className="text-red-800">{error}</p>}
  </form>;
}
