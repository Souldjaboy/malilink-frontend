"use client";

import { useState } from "react";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import { authFetch } from "../../lib/api";
import {
  MODELES_BULLETIN, MODELES_CARTE, requeteOptions, useApercuSvg, type Etablissement,
} from "../lib/education";

/* Choix du modèle de carte scolaire et du modèle de bulletin : vignettes
   des six modèles, options, aperçu en direct avec l'identité réelle de
   l'école (élève fictif). Rien n'est enregistré avant « Enregistrer ». */

type Options = Record<string, string | boolean | undefined>;
type Bascule = { cle: string; libelle: string; defaut: boolean };

const BASCULES_CARTE: Bascule[] = [
  { cle: "afficher_logo", libelle: "Logo", defaut: true },
  { cle: "afficher_photo", libelle: "Photo de l'élève", defaut: true },
  { cle: "afficher_niveau", libelle: "Niveau", defaut: true },
  { cle: "afficher_naissance", libelle: "Date de naissance", defaut: false },
  { cle: "afficher_signature", libelle: "Signature et cachet", defaut: true },
  { cle: "afficher_slogan", libelle: "Slogan", defaut: true },
];
const BASCULES_BULLETIN: Bascule[] = [
  { cle: "afficher_logo", libelle: "Logo", defaut: true },
  { cle: "afficher_photo", libelle: "Photo de l'élève", defaut: false },
  { cle: "afficher_rang", libelle: "Rang", defaut: true },
  { cle: "afficher_moyenne_classe", libelle: "Moyenne de la classe", defaut: true },
  { cle: "afficher_appreciations", libelle: "Appréciations", defaut: true },
  { cle: "afficher_signature", libelle: "Signature", defaut: true },
  { cle: "afficher_cachet", libelle: "Cachet", defaut: true },
];

function Apercu({ chemin, alt, ratio }: { chemin: string; alt: string; ratio: string }) {
  const { url, erreur, enCours } = useApercuSvg(chemin);
  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200" style={{ aspectRatio: ratio }}>
      {url && <img src={url} alt={alt} className={`h-full w-full object-contain transition-opacity ${enCours ? "opacity-60" : ""}`} />}
      {!url && !erreur && <Loader2 className="absolute inset-0 m-auto animate-spin text-slate-400" aria-hidden="true" />}
      {erreur && <p className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-slate-500">Aperçu indisponible</p>}
    </div>
  );
}

function ChoixModele({
  type, etab, onSaved,
}: { type: "carte" | "bulletin"; etab: Etablissement; onSaved: () => void }) {
  const carte = type === "carte";
  const liste = carte ? MODELES_CARTE : MODELES_BULLETIN;
  const bascules = carte ? BASCULES_CARTE : BASCULES_BULLETIN;
  const enregistre = (carte ? etab.card_options : etab.report_options) || {};
  const initial = (): Options => ({
    ...Object.fromEntries(bascules.map((b) => [b.cle, typeof enregistre[b.cle] === "boolean" ? enregistre[b.cle] : b.defaut])),
    ...(carte ? { orientation: enregistre.orientation === "portrait" ? "portrait" : "paysage" } : {}),
    couleur_principale: typeof enregistre.couleur_principale === "string" ? enregistre.couleur_principale : etab.color_primary,
    couleur_secondaire: typeof enregistre.couleur_secondaire === "string" ? enregistre.couleur_secondaire : etab.color_secondary,
  });
  const [modele, setModele] = useState(carte ? etab.card_template : etab.report_template);
  const [options, setOptions] = useState<Options>(initial);
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const base = carte ? "/education/cartes/apercu" : "/education/bulletins/apercu";
  const portrait = carte && options.orientation === "portrait";
  const ratioCarte = portrait ? "153 / 243" : "243 / 153";
  const ratio = carte ? ratioCarte : "595 / 842";

  const enregistrer = async () => {
    setEnvoi(true);
    setMessage("");
    // Couleurs identiques à celles de l'établissement : on ne les fige pas.
    const opts: Options = { ...options };
    if (opts.couleur_principale === etab.color_primary) delete opts.couleur_principale;
    if (opts.couleur_secondaire === etab.color_secondary) delete opts.couleur_secondaire;
    const corps = carte ? { card_template: modele, card_options: opts } : { report_template: modele, report_options: opts };
    const r = await authFetch("/education/etablissement", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    setEnvoi(false);
    setMessage(r?.ok ? `Modèle « ${liste.find((m) => m.code === modele)?.libelle} » enregistré.` : "Enregistrement impossible.");
    if (r?.ok) onSaved();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="font-black text-slate-900">{carte ? "Modèle de carte scolaire" : "Modèle de bulletin"}</h2>
        <p className="text-sm text-slate-500">Six mises en page différentes. Aperçu avec l&apos;identité de votre école et un élève fictif.</p>
        <div className={`mt-3 grid gap-3 ${carte ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
          {liste.map((m) => {
            const choisi = m.code === modele;
            return (
              <button key={m.code} type="button" onClick={() => setModele(m.code)} aria-pressed={choisi}
                className={`rounded-2xl p-2 text-left ring-2 transition ${choisi ? "bg-amber-50 ring-amber-500" : "ring-transparent hover:bg-slate-50"}`}>
                <Apercu chemin={`${base}?${requeteOptions(m.code, options)}`} alt={`Modèle ${m.libelle}`} ratio={ratio} />
                <span className="mt-1.5 flex items-center gap-1 text-sm font-bold text-slate-900">{choisi && <Check size={15} className="text-amber-600" />}{m.libelle}</span>
                <span className="block text-xs text-slate-500">{m.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          {carte && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">Orientation</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
                {(["paysage", "portrait"] as const).map((o) => (
                  <button key={o} type="button" onClick={() => setOptions({ ...options, orientation: o })} aria-pressed={options.orientation === o}
                    className={`rounded-lg py-2 capitalize ${options.orientation === o ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{o}</button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(["couleur_principale", "couleur_secondaire"] as const).map((cle) => (
              <label key={cle} className="text-sm font-semibold text-slate-700">
                {cle === "couleur_principale" ? "Couleur principale" : "Couleur secondaire"}
                <input type="color" value={String(options[cle] || "#000000")} onChange={(e) => setOptions({ ...options, [cle]: e.target.value })}
                  className="mt-1 block h-10 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1" />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setOptions({ ...options, couleur_principale: etab.color_primary, couleur_secondaire: etab.color_secondary })}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
            <RotateCcw size={13} /> Reprendre les couleurs de l&apos;établissement
          </button>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-slate-700">Afficher</legend>
            <div className="space-y-1.5">
              {bascules.map((b) => (
                <label key={b.cle} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 text-sm text-slate-800 hover:bg-slate-50">
                  {b.libelle}
                  <input type="checkbox" checked={options[b.cle] === true} onChange={(e) => setOptions({ ...options, [b.cle]: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                </label>
              ))}
            </div>
          </fieldset>
          {message && <p className="rounded-xl bg-emerald-50 p-2.5 text-sm font-semibold text-emerald-800">{message}</p>}
          <button type="button" onClick={enregistrer} disabled={envoi}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-black text-white disabled:opacity-60">
            {envoi ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Enregistrer ce modèle
          </button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-700">Aperçu — {liste.find((m) => m.code === modele)?.libelle}</p>
          {carte ? (
            <div className={`grid gap-4 ${portrait ? "grid-cols-2 sm:max-w-md" : "sm:grid-cols-2"}`}>
              {(["recto", "verso"] as const).map((face) => (
                <div key={face}>
                  <Apercu chemin={`${base}?${requeteOptions(modele, { ...options, face })}`} alt={`Carte ${face}`} ratio={ratioCarte} />
                  <p className="mt-1 text-center text-xs font-semibold capitalize text-slate-500">{face}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl">
              <Apercu chemin={`${base}?${requeteOptions(modele, options)}`} alt="Bulletin" ratio="595 / 842" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export const ModeleCarte = (p: { etab: Etablissement; onSaved: () => void }) => <ChoixModele type="carte" {...p} />;
export const ModeleBulletin = (p: { etab: Etablissement; onSaved: () => void }) => <ChoixModele type="bulletin" {...p} />;
