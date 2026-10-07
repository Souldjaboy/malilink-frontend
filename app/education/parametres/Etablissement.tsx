"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { authFetch } from "../../lib/api";
import { urlFichier, type Etablissement as Etab } from "../lib/education";

/* Paramètres › Éducation › Établissement : saisis une seule fois, repris
   sur la carte scolaire, les bulletins, les fiches et les reçus. */

const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
const etiquette = "mb-1 block text-sm font-semibold text-slate-700";

const FICHIERS: { nature: "logo" | "sceau" | "signature" | "cachet"; libelle: string; aide: string }[] = [
  { nature: "logo", libelle: "Logo", aide: "PNG à fond transparent conseillé" },
  { nature: "sceau", libelle: "Sceau", aide: "Filigrane des cartes institutionnelles" },
  { nature: "signature", libelle: "Signature du directeur", aide: "PNG à fond transparent" },
  { nature: "cachet", libelle: "Cachet", aide: "PNG à fond transparent" },
];

type Annee = { id: number; label: string };

function Fichier({ nature, libelle, aide, url, onChange }: { nature: string; libelle: string; aide: string; url: string | null; onChange: () => void }) {
  const entree = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const envoyer = async (f: File | undefined) => {
    if (!f) return;
    setErreur("");
    if (!/^image\/(png|jpeg)$/.test(f.type)) return setErreur("JPEG ou PNG uniquement.");
    if (f.size > 5 * 1024 * 1024) return setErreur("5 Mo au plus.");
    setEnvoi(true);
    const fd = new FormData();
    fd.append("file", f);
    const r = await authFetch(`/education/etablissement/fichiers/${nature}`, { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnvoi(false);
    if (!r?.ok) return setErreur(d?.error || "Envoi impossible.");
    onChange();
  };
  const retirer = async () => {
    setEnvoi(true);
    await authFetch(`/education/etablissement/fichiers/${nature}`, { method: "DELETE" }).catch(() => null);
    setEnvoi(false);
    onChange();
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:12px_12px]">
        {url ? <img src={urlFichier(url)} alt={libelle} className="max-h-full max-w-full object-contain" /> : <ImagePlus className="text-slate-300" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900">{libelle}</p>
        <p className="text-xs text-slate-500">{aide}</p>
        {erreur && <p role="alert" className="text-xs font-semibold text-red-700">{erreur}</p>}
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={() => entree.current?.click()} disabled={envoi}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60">
            {envoi ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} {url ? "Remplacer" : "Importer"}
          </button>
          {url && (
            <button type="button" onClick={retirer} disabled={envoi} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Trash2 size={13} /> Retirer
            </button>
          )}
        </div>
        <input ref={entree} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { envoyer(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}

export default function Etablissement({ etab, annees, onSaved, onFichiers }: { etab: Etab; annees: Annee[]; onSaved: () => void; onFichiers: () => void }) {
  const [f, setF] = useState(() => ({
    official_name: etab.official_name, short_name: etab.short_name, slogan: etab.slogan, address: etab.address, phone: etab.phone,
    whatsapp: etab.whatsapp, email: etab.email, website: etab.website, director_name: etab.director_name,
    color_primary: etab.color_primary, color_secondary: etab.color_secondary,
    active_school_year_id: etab.active_school_year_id ? String(etab.active_school_year_id) : "",
    matricule_prefix: etab.matricule_prefix, matricule_manual_allowed: etab.matricule_manual_allowed,
  }));
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const maj = (cle: keyof typeof f, v: string | boolean) => setF({ ...f, [cle]: v });

  const enregistrer = async () => {
    setMessage("");
    setErreur("");
    if (!f.official_name.trim()) return setErreur("Le nom officiel est obligatoire.");
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return setErreur("Adresse e-mail invalide.");
    setEnvoi(true);
    const r = await authFetch("/education/etablissement", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, active_school_year_id: f.active_school_year_id ? Number(f.active_school_year_id) : null }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnvoi(false);
    if (!r?.ok) return setErreur(d?.error || "Enregistrement impossible.");
    setMessage("Établissement enregistré : ces informations sont reprises sur les cartes, bulletins, fiches et reçus.");
    onSaved();
  };

  const texte = (cle: keyof typeof f, libelle: string, o: { type?: string; placeholder?: string } = {}) => (
    <div>
      <label htmlFor={`etab-${cle}`} className={etiquette}>{libelle}</label>
      <input id={`etab-${cle}`} type={o.type || "text"} value={String(f[cle] ?? "")} placeholder={o.placeholder}
        onChange={(e) => maj(cle, e.target.value)} className={champ} />
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="font-black text-slate-900">Identité</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {texte("official_name", "Nom officiel *", { placeholder: "Groupe Scolaire …" })}
          {texte("short_name", "Nom court", { placeholder: "Sigle affiché sur la carte" })}
          {texte("slogan", "Slogan / devise")}
          {texte("director_name", "Directeur / chef d'établissement")}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="font-black text-slate-900">Coordonnées</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {texte("address", "Adresse")}
          {texte("phone", "Téléphone", { type: "tel" })}
          {texte("whatsapp", "WhatsApp", { type: "tel" })}
          {texte("email", "E-mail", { type: "email" })}
          {texte("website", "Site internet", { placeholder: "https://…" })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="font-black text-slate-900">Logo, sceau, signature, cachet</h2>
        <p className="text-sm text-slate-500">Importés une fois, ils apparaissent automatiquement sur chaque document. Fichiers privés, jamais publiés.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {FICHIERS.map((x) => <Fichier key={x.nature} {...x} url={etab[x.nature]} onChange={onFichiers} />)}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="font-black text-slate-900">Couleurs officielles, année active, matricule</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["color_primary", "color_secondary"] as const).map((cle) => (
            <div key={cle}>
              <label htmlFor={`etab-${cle}`} className={etiquette}>{cle === "color_primary" ? "Couleur principale" : "Couleur secondaire"}</label>
              <div className="flex gap-2">
                <input type="color" aria-label={cle === "color_primary" ? "Choisir la couleur principale" : "Choisir la couleur secondaire"} value={f[cle]}
                  onChange={(e) => maj(cle, e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1" />
                <input id={`etab-${cle}`} value={f[cle]} onChange={(e) => maj(cle, e.target.value)} className={`${champ} font-mono`} maxLength={7} />
              </div>
            </div>
          ))}
          <div>
            <label htmlFor="etab-annee" className={etiquette}>Année scolaire active</label>
            <select id="etab-annee" value={f.active_school_year_id} onChange={(e) => maj("active_school_year_id", e.target.value)} className={champ}>
              <option value="">Choisir…</option>
              {annees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          {texte("matricule_prefix", "Préfixe des matricules", { placeholder: "Ex. GSH → GSH-2026-0001" })}
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={f.matricule_manual_allowed} onChange={(e) => maj("matricule_manual_allowed", e.target.checked)} className="h-4 w-4 accent-amber-500" />
            Autoriser la saisie manuelle du matricule à l&apos;inscription
          </label>
        </div>
      </section>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{erreur}</p>}
      <button type="button" onClick={enregistrer} disabled={envoi}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 font-black text-white disabled:opacity-60 sm:w-auto sm:px-8">
        {envoi ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Enregistrer l&apos;établissement
      </button>
    </div>
  );
}
