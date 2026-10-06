"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive, ArchiveRestore, ChevronRight, FileText, GraduationCap, IdCard, Loader2, Printer, Receipt, RefreshCw, Search, UserPlus, X,
} from "lucide-react";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";
import PhotoEleve from "../components/PhotoEleve";
import Encaisser from "../components/Encaisser";
import {
  dateFr, envoyerPhotoEleve, ETATS_INSCRIPTION, libelleMode, ouvrirDocument, RELATIONS_FR,
  statutEcheance, STATUTS_ECHEANCE, urlFichier, type Classe, type Dossier, type Eleve,
} from "../lib/education";

/* Élèves & badges : gestion des dossiers. Aucune création ici — un nouvel
   élève passe par Éducation › Inscription, point d'entrée unique. */

type Onglet = "identite" | "scolarite" | "paiements" | "badge";
const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "identite", libelle: "Dossier" }, { id: "scolarite", libelle: "Scolarité" },
  { id: "paiements", libelle: "Paiements" }, { id: "badge", libelle: "Badge" },
];
const STATUTS_ELEVE: Record<string, string> = {
  actif: "Actif", suspendu: "Suspendu", transfere: "Transféré", diplome: "Diplômé", abandonne: "Abandon",
};
const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
const etiquette = "mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500";

function Vignette({ eleve, taille = "h-12 w-9" }: { eleve: Pick<Eleve, "photo_url" | "first_name" | "last_name">; taille?: string }) {
  return (
    <span className={`${taille} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200 text-xs font-black text-slate-500`}>
      {eleve.photo_url
        ? <img src={urlFichier(eleve.photo_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
        : `${eleve.first_name[0] || ""}${eleve.last_name[0] || ""}`}
    </span>
  );
}

function FicheEleve({ id, classes, onFermer, onChange }: { id: number; classes: Classe[]; onFermer: () => void; onChange: () => void }) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("identite");
  const [form, setForm] = useState<Record<string, string>>({});
  const [edition, setEdition] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [badge, setBadge] = useState<{ qr_data_url: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const r = await authFetch(`/education/students/${id}/dossier`).catch(() => null);
    if (!r?.ok) { setErreur("Dossier introuvable."); return; }
    const d: Dossier = await r.json();
    setDossier(d);
    const e = d.eleve;
    setForm({
      first_name: e.first_name, last_name: e.last_name, gender: e.gender || "", birth_date: e.birth_date?.slice(0, 10) || "",
      birth_place: e.birth_place || "", address: e.address || "", phone: e.phone || "", email: e.email || "",
      guardian_name: e.guardian_name || "", guardian_relation: e.guardian_relation || "tuteur", guardian_phone: e.guardian_phone || "",
      guardian_email: e.guardian_email || "", class_id: e.class_id ? String(e.class_id) : "",
    });
  }, [id]);

  useEffect(() => { queueMicrotask(charger); }, [charger]);
  useEffect(() => {
    if (onglet !== "badge" || badge) return;
    authFetch(`/education/students/${id}/badge`).then(async (r) => { if (r.ok) setBadge(await r.json()); }).catch(() => {});
  }, [onglet, badge, id]);

  const doc = async (chemin: string, nom: string) => { const e = await ouvrirDocument(chemin, nom); if (e) setErreur(e); };
  const informer = (m: string) => { setMessage(m); setErreur(""); };

  const enregistrer = async () => {
    setEnvoi(true);
    const r = await authFetch(`/education/students/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, gender: form.gender || null, birth_date: form.birth_date || null, class_id: form.class_id ? Number(form.class_id) : null }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnvoi(false);
    if (!r?.ok) return setErreur(d?.error || "Modification non enregistrée.");
    setEdition(false);
    informer("Dossier mis à jour.");
    await charger();
    onChange();
  };

  const archiver = async (restaurer: boolean) => {
    if (!restaurer && !window.confirm("Archiver ce dossier ? L'élève disparaît des listes ; ses paiements et notes sont conservés.")) return;
    const r = await authFetch(`/education/students/${id}/${restaurer ? "restore" : "archive"}`, { method: "POST" }).catch(() => null);
    if (!r?.ok) return setErreur("Action impossible.");
    informer(restaurer ? "Dossier restauré." : "Dossier archivé.");
    await charger();
    onChange();
  };

  const changerPhoto = async (b: Blob | null) => {
    if (!b) return;
    setEnvoi(true);
    const res = await envoyerPhotoEleve(id, b);
    setEnvoi(false);
    if (res.erreur) return setErreur(res.erreur);
    informer("Photo enregistrée.");
    await charger();
    onChange();
  };

  const e = dossier?.eleve;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFermer}>
      <section className="flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl" onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Dossier de l'élève">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white p-4">
          {e ? <Vignette eleve={e} taille="h-16 w-12" /> : <span className="h-16 w-12 rounded-lg bg-slate-200" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-slate-900">{e ? `${e.first_name} ${e.last_name}` : "Chargement…"}</p>
            {e && (
              <p className="truncate text-sm text-slate-500">
                <span className="font-mono font-bold text-slate-700">{e.matricule}</span> · {e.class_name || "sans classe"}
                {e.archived_at ? " · archivé" : ` · ${STATUTS_ELEVE[e.status] || e.status}`}
              </p>
            )}
          </div>
          <button type="button" onClick={onFermer} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer"><X size={22} /></button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2" aria-label="Sections du dossier">
          {ONGLETS.map((o) => (
            <button key={o.id} type="button" onClick={() => setOnglet(o.id)} aria-current={onglet === o.id ? "page" : undefined} data-nav-sombre
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold ${onglet === o.id ? "border-amber-500 text-slate-900" : "border-transparent text-slate-500"}`}>
              {o.libelle}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
          {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{erreur}</p>}
          {!dossier && !erreur && <Loader2 className="mx-auto animate-spin text-slate-400" />}

          {e && onglet === "identite" && (
            <>
              <PhotoEleve apercu={e.photo_url ? urlFichier(e.photo_url) : null} onChange={changerPhoto} retirable={false} />
              {edition ? (
                <div className="space-y-3 rounded-2xl bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ["first_name", "Prénom"], ["last_name", "Nom"], ["birth_date", "Date de naissance", "date"], ["birth_place", "Lieu de naissance"],
                      ["address", "Adresse"], ["phone", "Téléphone de l'élève", "tel"], ["email", "E-mail de l'élève", "email"],
                      ["guardian_name", "Parent / tuteur"], ["guardian_phone", "Téléphone du tuteur", "tel"], ["guardian_email", "E-mail du tuteur", "email"],
                    ] as const).map(([cle, lib, type]) => (
                      <label key={cle}><span className={etiquette}>{lib}</span>
                        <input type={type || "text"} value={form[cle] || ""} onChange={(ev) => setForm({ ...form, [cle]: ev.target.value })} className={champ} /></label>
                    ))}
                    <label><span className={etiquette}>Sexe</span>
                      <select value={form.gender} onChange={(ev) => setForm({ ...form, gender: ev.target.value })} className={champ}>
                        <option value="">—</option><option value="M">Garçon</option><option value="F">Fille</option>
                      </select></label>
                    <label><span className={etiquette}>Lien du tuteur</span>
                      <select value={form.guardian_relation} onChange={(ev) => setForm({ ...form, guardian_relation: ev.target.value })} className={champ}>
                        {Object.entries(RELATIONS_FR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select></label>
                    <label className="sm:col-span-2"><span className={etiquette}>Classe (affectation)</span>
                      <select value={form.class_id} onChange={(ev) => setForm({ ...form, class_id: ev.target.value })} className={champ}>
                        <option value="">Sans classe</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select></label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEdition(false); charger(); }} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-800">Annuler</button>
                    <button type="button" onClick={enregistrer} disabled={envoi} className="flex-1 rounded-xl bg-slate-900 py-3 font-black text-white disabled:opacity-60">Enregistrer</button>
                  </div>
                </div>
              ) : (
                <dl className="grid gap-x-4 gap-y-3 rounded-2xl bg-white p-4 text-sm sm:grid-cols-2">
                  {[
                    ["Sexe", e.gender === "F" ? "Fille" : e.gender === "M" ? "Garçon" : "—"],
                    ["Naissance", e.birth_date ? `${dateFr(e.birth_date)}${e.birth_place ? ` à ${e.birth_place}` : ""}` : "—"],
                    ["Adresse", e.address || "—"], ["Contact élève", [e.phone, e.email].filter(Boolean).join(" · ") || "—"],
                    [`${RELATIONS_FR[e.guardian_relation] || "Tuteur"}`, e.guardian_name || "—"],
                    ["Contact tuteur", [e.guardian_phone, e.guardian_email].filter(Boolean).join(" · ") || "—"],
                    ["Classe", e.class_name || "—"], ["Niveau", e.class_level || "—"],
                  ].map(([k, v]) => (
                    <div key={k}><dt className={etiquette}>{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>
                  ))}
                </dl>
              )}
              {!edition && (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEdition(true)} className="rounded-xl bg-slate-900 py-3 font-bold text-white">Modifier le dossier</button>
                  <Link href={`/education/inscriptions?eleve=${e.id}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 font-bold text-slate-900 ring-1 ring-slate-200">
                    <RefreshCw size={16} aria-hidden="true" /> Réinscrire
                  </Link>
                  {e.archived_at ? (
                    <button type="button" onClick={() => archiver(true)} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 font-bold text-emerald-700 ring-1 ring-slate-200">
                      <ArchiveRestore size={16} aria-hidden="true" /> Restaurer le dossier
                    </button>
                  ) : (
                    <button type="button" onClick={() => archiver(false)} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-white py-3 font-bold text-red-700 ring-1 ring-slate-200">
                      <Archive size={16} aria-hidden="true" /> Archiver le dossier
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {dossier && onglet === "scolarite" && (
            dossier.inscriptions.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Aucune inscription enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {dossier.inscriptions.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900">{i.year_label || "Année ?"} · {i.class_name || "sans classe"}</p>
                      <p className="text-xs text-slate-500"><span className="font-mono">{i.reference}</span> · {ETATS_INSCRIPTION[i.enrollment_state] || i.enrollment_state} le {dateFr(i.enrollment_date || i.created_at)}</p>
                    </div>
                    <button type="button" onClick={() => doc(`/education/enrollments/${i.id}/pdf`, `inscription-${i.reference}.pdf`)}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-bold text-slate-700"><FileText size={15} /> Fiche</button>
                  </li>
                ))}
              </ul>
            )
          )}

          {dossier && onglet === "paiements" && (
            dossier.echeanciers.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">Aucun échéancier pour cet élève.</p>
            ) : dossier.echeanciers.map((p) => {
              const paye = Number(p.total_paid);
              const totalPlan = Number(p.total_amount);
              return (
                <section key={p.id} className="space-y-3 rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-slate-900">{p.label}</h3>
                    <button type="button" onClick={() => doc(`/education/fee-plans/${p.id}/schedule/pdf`, "echeancier.pdf")}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"><FileText size={14} /> PDF</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-slate-50 p-2"><p className="text-xs text-slate-500">Total</p><p className="font-black">{formatFCFA(totalPlan)}</p></div>
                    <div className="rounded-xl bg-emerald-50 p-2"><p className="text-xs text-emerald-700">Payé</p><p className="font-black text-emerald-800">{formatFCFA(paye)}</p></div>
                    <div className="rounded-xl bg-amber-50 p-2"><p className="text-xs text-amber-700">Reste</p><p className="font-black text-amber-800">{formatFCFA(Math.max(0, totalPlan - paye))}</p></div>
                  </div>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {(p.echeances || []).map((ech) => {
                      const s = STATUTS_ECHEANCE[statutEcheance(ech)];
                      return (
                        <li key={ech.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{ech.label}</span>
                            <span className="text-xs text-slate-500">{dateFr(ech.due_date)}</span></span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="tabular-nums text-slate-700">{formatFCFA(ech.amount)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.classe}`}>{s.libelle}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {p.status !== "cancelled" && <Encaisser plan={p} onFait={async (m) => { informer(m); await charger(); onChange(); }} />}
                  {(p.paiements || []).length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Historique</p>
                      <ul className="divide-y divide-slate-100 text-sm">
                        {(p.paiements || []).map((pay) => (
                          <li key={pay.id} className={`flex items-center justify-between gap-2 py-2 ${pay.status !== "paid" ? "opacity-50" : ""}`}>
                            <span className="min-w-0">
                              <span className="block font-semibold text-slate-800">{formatFCFA(pay.amount)} · {libelleMode(pay.method)}{pay.status !== "paid" ? " · annulé" : ""}</span>
                              <span className="font-mono text-xs text-slate-500">{pay.receipt_number} · {dateFr(pay.created_at)}</span>
                            </span>
                            <button type="button" onClick={() => doc(`/education/fee-payments/${pay.id}/receipt`, `recu-${pay.receipt_number}.pdf`)}
                              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"><Receipt size={14} /> Reçu</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })
          )}

          {e && onglet === "badge" && (
            <section className="space-y-3 rounded-2xl bg-white p-4 text-center">
              <div id="badge-imprimable" className="mx-auto w-64 rounded-2xl border border-slate-200 p-4">
                <div className="mx-auto h-28 w-[84px] overflow-hidden rounded-lg bg-slate-100">
                  {e.photo_url && <img src={urlFichier(e.photo_url)} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 font-black text-slate-900">{e.first_name} {e.last_name}</p>
                <p className="font-mono text-sm text-slate-600">{e.matricule} · {e.class_name || "—"}</p>
                {badge ? <img src={badge.qr_data_url} alt="Code QR du badge" className="mx-auto mt-2 h-40 w-40" /> : <Loader2 className="mx-auto mt-6 animate-spin text-slate-400" />}
              </div>
              <p className="text-xs text-slate-500">Le code QR sert au pointage des présences. Il ne contient aucune donnée personnelle.</p>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">
                <Printer size={18} aria-hidden="true" /> Imprimer
              </button>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ElevesPage() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [classe, setClasse] = useState("");
  const [recherche, setRecherche] = useState("");
  const [archives, setArchives] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [refus, setRefus] = useState("");
  const [ouvert, setOuvert] = useState<number | null>(null);

  const charger = useCallback(async () => {
    const p = new URLSearchParams();
    if (classe) p.set("class_id", classe);
    if (recherche.trim()) p.set("q", recherche.trim());
    if (archives) p.set("archives", "1");
    const r = await authFetch(`/education/students?${p}`).catch(() => null);
    if (r?.ok) setEleves(await r.json());
    else if (r?.status === 403) setRefus("Accès réservé au personnel de l'établissement.");
    setChargement(false);
  }, [classe, recherche, archives]);

  useEffect(() => {
    const t = setTimeout(charger, recherche ? 250 : 0);
    return () => clearTimeout(t);
  }, [charger, recherche]);

  useEffect(() => {
    authFetch("/education/classes").then(async (r) => { if (r.ok) setClasses(await r.json()); }).catch(() => {});
    const id = Number(new URLSearchParams(window.location.search).get("eleve"));
    if (id) queueMicrotask(() => setOuvert(id));
  }, []);

  const ouvrir = (id: number | null) => {
    setOuvert(id);
    window.history.replaceState(null, "", id ? `/education/eleves?eleve=${id}` : "/education/eleves");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/education" className="text-sm font-bold text-slate-500 hover:text-slate-800">← Éducation</Link>
            <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Élèves & badges</h1>
          </div>
          <Link href="/education/inscriptions" className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-black text-black">
            <UserPlus size={18} aria-hidden="true" /> Nouvelle inscription
          </Link>
        </div>

        <div className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-[1fr_200px_auto]">
          <label className="relative">
            <span className="sr-only">Rechercher</span>
            <Search size={18} className="absolute left-3 top-3 text-slate-400" aria-hidden="true" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, prénom ou matricule" className={`${champ} pl-10`} />
          </label>
          <select value={classe} onChange={(e) => setClasse(e.target.value)} aria-label="Classe" className={champ}>
            <option value="">Toutes les classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
            <button type="button" onClick={() => setArchives(false)} aria-pressed={!archives}
              className={`rounded-lg px-3 py-1.5 ${!archives ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Actifs</button>
            <button type="button" onClick={() => setArchives(true)} aria-pressed={archives}
              className={`rounded-lg px-3 py-1.5 ${archives ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Archivés</button>
          </div>
        </div>

        {refus ? (
          <p className="rounded-2xl bg-white p-6 text-center font-semibold text-slate-700">{refus}</p>
        ) : chargement ? (
          <Loader2 className="mx-auto animate-spin text-slate-400" />
        ) : eleves.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center">
            <GraduationCap className="mx-auto text-slate-300" size={40} aria-hidden="true" />
            <p className="mt-2 font-bold text-slate-700">{archives ? "Aucun dossier archivé." : recherche || classe ? "Aucun élève ne correspond." : "Aucun élève pour le moment."}</p>
            {!archives && !recherche && !classe && (
              <Link href="/education/inscriptions" className="mt-3 inline-block font-bold text-amber-700 underline">Inscrire le premier élève</Link>
            )}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">{eleves.length} élève(s)</p>
            <ul className="divide-y divide-slate-100">
              {eleves.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => ouvrir(s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <Vignette eleve={s} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-900">{s.last_name.toUpperCase()} {s.first_name}</span>
                      <span className="block truncate text-xs text-slate-500"><span className="font-mono">{s.matricule}</span> · {s.class_name || "sans classe"}</span>
                    </span>
                    {s.status !== "actif" && <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 sm:inline">{STATUTS_ELEVE[s.status] || s.status}</span>}
                    <span className="hidden items-center gap-1 text-xs font-bold text-slate-400 sm:flex"><IdCard size={15} aria-hidden="true" /> Badge</span>
                    <ChevronRight size={18} className="text-slate-300" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {ouvert && <FicheEleve id={ouvert} classes={classes} onFermer={() => ouvrir(null)} onChange={charger} />}
    </div>
  );
}
