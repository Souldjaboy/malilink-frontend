import { useEffect, useState } from "react";
import { apiUrl, authFetch } from "../../lib/api";

/* Outils partagés des écrans Éducation (inscription, élèves, frais). */

export type Annee = { id: number; label: string; start_date: string | null; end_date: string | null; is_active: boolean };
export type Classe = { id: number; name: string; level: string | null; school_year_id: number | null; effectif?: number };
export type ModePaiement = { code: string; libelle: string };

export type OptionsInscription = {
  annees: Annee[];
  annee_active_id: number | null;
  classes: Classe[];
  matricule: { manuel_autorise: boolean; prefixe: string };
  modes_paiement: ModePaiement[];
  relations: string[];
};

export type Eleve = {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  gender: "M" | "F" | null;
  birth_date: string | null;
  birth_place: string;
  address: string;
  phone: string;
  email: string;
  guardian_name: string;
  guardian_relation: string;
  guardian_phone: string;
  guardian_email: string;
  class_id: number | null;
  class_name: string | null;
  class_level?: string | null;
  status: string;
  archived_at: string | null;
  photo_url: string | null;
  qr_code?: string;
};

export type Echeance = {
  id: number; seq: number; label: string; due_date: string; amount: string; amount_paid: string; status: string;
  kind: "inscription" | "mensualite" | "autre";
};
export type PaiementRecu = {
  id: number; receipt_number: string; amount: string; method: string; reference: string; status: string; created_at: string;
};
export type Echeancier = {
  id: number; label: string; total_amount: string; total_paid: string; status: string; enrollment_id: number | null;
  echeances: Echeance[] | null; paiements: PaiementRecu[] | null;
};
export type InscriptionDossier = {
  id: number; reference: string; year_label: string | null; class_name: string | null; level: string; section: string;
  enrollment_date: string | null; enrollment_state: string; enrollment_fee: string; amount_paid: string; status: string;
  fee_plan_id: number | null; created_at: string;
};
export type Dossier = {
  eleve: Eleve;
  inscriptions: InscriptionDossier[];
  echeanciers: Echeancier[];
  carte: { reference: string; school_year_label: string; status: string; issued_at: string; valid_until: string | null } | null;
};

export const MODES_PAR_DEFAUT: ModePaiement[] = [
  { code: "especes", libelle: "Espèces" },
  { code: "wave", libelle: "Wave" },
  { code: "orange_money", libelle: "Orange Money" },
  { code: "virement", libelle: "Virement" },
  { code: "cheque", libelle: "Chèque" },
  { code: "autre", libelle: "Autre" },
];

export const RELATIONS_FR: Record<string, string> = {
  pere: "Père", mere: "Mère", tuteur: "Tuteur", tutrice: "Tutrice", oncle: "Oncle", tante: "Tante",
  frere: "Frère", soeur: "Sœur", grand_parent: "Grand-parent", autre: "Autre",
};

export const ETATS_INSCRIPTION: Record<string, string> = {
  inscrit: "Inscrit", preinscrit: "Préinscrit", abandon: "Abandon", transfere: "Transféré", termine: "Terminé",
};

export const STATUTS_ECHEANCE: Record<string, { libelle: string; classe: string }> = {
  paid: { libelle: "Payée", classe: "bg-emerald-100 text-emerald-800" },
  partial: { libelle: "Partielle", classe: "bg-amber-100 text-amber-800" },
  pending: { libelle: "À payer", classe: "bg-slate-100 text-slate-700" },
  overdue: { libelle: "En retard", classe: "bg-red-100 text-red-800" },
};

export const libelleMode = (code: string, modes: ModePaiement[] = MODES_PAR_DEFAUT) =>
  modes.find((m) => m.code === code)?.libelle || code || "—";

/** Montant saisi (« 25 000 », « 25000,5 ») → nombre ; vide → 0 ; invalide → NaN. */
export function lireMontant(v: string): number {
  const propre = String(v ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  if (!propre) return 0;
  const n = Number(propre);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export const dateFr = (iso: string | null | undefined) =>
  iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const urlFichier = (chemin: string | null | undefined) => (chemin ? apiUrl(chemin) : "");

/** Une échéance non soldée dont la date est passée est « en retard ». */
export function statutEcheance(e: Echeance): keyof typeof STATUTS_ECHEANCE {
  if (e.status === "paid" || Number(e.amount_paid) >= Number(e.amount)) return "paid";
  if (e.due_date && e.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)) return "overdue";
  return Number(e.amount_paid) > 0 ? "partial" : "pending";
}

/**
 * Ouvre un document protégé (PDF : fiche, reçu, échéancier) dans un nouvel
 * onglet. La fenêtre est ouverte AVANT l'appel réseau : ouverte après, elle
 * serait bloquée par le navigateur (surtout sur téléphone).
 */
export async function ouvrirDocument(chemin: string, nomFichier = "document.pdf"): Promise<string | null> {
  const fenetre = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const r = await authFetch(chemin);
    if (!r.ok) {
      fenetre?.close();
      const d = await r.json().catch(() => null);
      return d?.error || "Document indisponible.";
    }
    const url = URL.createObjectURL(await r.blob());
    if (fenetre) fenetre.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = nomFichier;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  } catch {
    fenetre?.close();
    return "Connexion impossible. Réessayez.";
  }
}

/** Téléverse la photo (déjà recadrée) d'un élève ; renvoie l'URL signée. */
export async function envoyerPhotoEleve(eleveId: number, photo: Blob): Promise<{ url?: string; erreur?: string }> {
  const fd = new FormData();
  fd.append("file", photo, `eleve-${eleveId}.jpg`);
  const r = await authFetch(`/education/students/${eleveId}/photo`, { method: "POST", body: fd });
  const d = await r.json().catch(() => null);
  return r.ok ? { url: d?.photo_url } : { erreur: d?.error || "Photo non enregistrée." };
}

/**
 * Aperçu SVG produit par le serveur (carte, bulletin) : chargé avec le jeton,
 * affiché par une URL locale dans une balise <img> (aucun script possible).
 * Les changements rapprochés (couleurs, options) sont regroupés.
 */
export function useApercuSvg(chemin: string | null, delai = 250) {
  const [etat, setEtat] = useState<{ chemin: string | null; url: string | null; erreur: boolean }>({ chemin: null, url: null, erreur: false });
  useEffect(() => {
    if (!chemin) return;
    let actif = true;
    let objet: string | null = null;
    const minuterie = setTimeout(async () => {
      try {
        const r = await authFetch(chemin);
        if (!r.ok) throw new Error(String(r.status));
        objet = URL.createObjectURL(new Blob([await r.text()], { type: "image/svg+xml" }));
        if (actif) setEtat({ chemin, url: objet, erreur: false });
      } catch {
        if (actif) setEtat((e) => ({ ...e, chemin, erreur: true }));
      }
    }, delai);
    return () => {
      actif = false;
      clearTimeout(minuterie);
      const ancien = objet;
      if (ancien) setTimeout(() => URL.revokeObjectURL(ancien), 3000);
    };
  }, [chemin, delai]);
  return { url: etat.url, erreur: etat.erreur, enCours: etat.chemin !== chemin };
}

export type Etablissement = {
  official_name: string; short_name: string; slogan: string; address: string; city: string; phone: string; whatsapp: string;
  email: string; website: string; director_name: string; color_primary: string; color_secondary: string;
  active_school_year_id: number | null; active_year_label: string; matricule_prefix: string; matricule_manual_allowed: boolean;
  card_template: string; card_options: Record<string, string | boolean>; report_template: string; report_options: Record<string, string | boolean>;
  logo: string | null; sceau: string | null; signature: string | null; cachet: string | null;
};

export const MODELES_CARTE: { code: string; libelle: string; description: string }[] = [
  { code: "academique", libelle: "Académique classique", description: "Bandeau officiel, typographie à empattements" },
  { code: "moderne", libelle: "Moderne", description: "Panneau coloré, photo ronde, étiquettes" },
  { code: "premium", libelle: "Premium", description: "Fond sombre, filets dorés" },
  { code: "minimaliste", libelle: "Minimaliste", description: "Blanc, aéré, détails discrets" },
  { code: "institutionnel", libelle: "Institutionnel", description: "Cadre double, guilloché, sceau" },
  { code: "creatif", libelle: "Créatif", description: "Formes arrondies, couleurs vives" },
];
export const MODELES_BULLETIN: { code: string; libelle: string; description: string }[] = [
  { code: "institutionnel", libelle: "Institutionnel", description: "Tableau quadrillé, encadrés de synthèse" },
  { code: "academique", libelle: "Académique classique", description: "Typographie à empattements, filets" },
  { code: "moderne", libelle: "Moderne épuré", description: "Cartes de résultats, moyennes colorées" },
  { code: "premium", libelle: "Premium", description: "Bandeau sombre, accents dorés" },
  { code: "compact", libelle: "Compact", description: "Dense : min/max par matière, nombreuses matières" },
  { code: "elegant", libelle: "Élégant école privée", description: "Cadre orné, médaillons" },
];

/** Paramètres d'aperçu (modèle + options) en chaîne de requête. */
export function requeteOptions(modele: string, options: Record<string, string | boolean | undefined>) {
  const p = new URLSearchParams({ modele });
  for (const [k, v] of Object.entries(options)) {
    if (v === undefined || v === "") continue;
    p.set(k, typeof v === "boolean" ? (v ? "1" : "0") : v);
  }
  return p.toString();
}
