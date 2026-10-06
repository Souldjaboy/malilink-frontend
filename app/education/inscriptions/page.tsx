"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, FileText, GraduationCap, IdCard, Loader2, Receipt, RotateCcw, Search, UserPlus, Users,
} from "lucide-react";
import { authFetch } from "../../lib/api";
import { formatFCFA } from "../../lib/format";
import PhotoEleve from "../components/PhotoEleve";
import {
  dateFr, envoyerPhotoEleve, ETATS_INSCRIPTION, lireMontant, MODES_PAR_DEFAUT, ouvrirDocument, RELATIONS_FR, urlFichier,
  type Eleve, type OptionsInscription,
} from "../lib/education";

/* Point d'entrée UNIQUE des inscriptions : élève → inscription → frais →
   paiement → validation. Un seul envoi crée le dossier, l'affectation de
   classe, l'échéancier, le premier paiement (reçu + comptabilité) ; la
   photo est ensuite rattachée au dossier. */

type Etape = 1 | 2 | 3 | 4 | 5;
const ETAPES: { n: Etape; titre: string }[] = [
  { n: 1, titre: "Élève" }, { n: 2, titre: "Inscription" }, { n: 3, titre: "Frais" }, { n: 4, titre: "Paiement" }, { n: 5, titre: "Validation" },
];

const ELEVE_VIDE = {
  first_name: "", last_name: "", gender: "", birth_date: "", birth_place: "", address: "", phone: "", email: "",
  guardian_name: "", guardian_relation: "pere", guardian_phone: "", guardian_email: "", matricule: "",
};
type FormEleve = typeof ELEVE_VIDE;
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const FRAIS_VIDES = {
  inscription: "", mensualite: "", mois: "9", premiere_echeance: "", autres: "", autres_libelle: "", reduction: "", bourse: "",
};
type FormFrais = typeof FRAIS_VIDES;

type Resultat = {
  eleve: Eleve;
  inscription: { id: number; reference: string; class_id: number | null };
  echeancier: { id: number; total_amount: number; reste: number };
  paiement: { id: number; receipt_number: string; amount: string } | null;
  photo?: { url?: string; erreur?: string };
};
type InscriptionRecente = {
  id: number; reference: string; first_name: string; last_name: string; student_matricule: string; class_name: string | null;
  enrollment_state: string | null; status: string; created_at: string; fee_plan_id: number | null;
};

const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
const etiquette = "mb-1 block text-sm font-semibold text-slate-700";

/* Même calcul que le serveur : réduction et bourse portent d'abord sur la
   scolarité, puis sur les autres frais, enfin sur l'inscription. */
function calculer(f: FormFrais) {
  const fraisInscription = lireMontant(f.inscription);
  const mensualite = lireMontant(f.mensualite);
  const autres = lireMontant(f.autres);
  const reduction = lireMontant(f.reduction);
  const bourse = lireMontant(f.bourse);
  const mois = f.mois === "" ? 0 : Number(f.mois);
  const nombres = [fraisInscription, mensualite, autres, reduction, bourse];
  if (nombres.some(Number.isNaN)) return { erreur: "Un montant est invalide." } as const;
  if (!Number.isInteger(mois) || mois < 0 || mois > 24) return { erreur: "Nombre de mensualités : de 0 à 24." } as const;
  const scolariteBrute = mensualite * mois;
  const brut = scolariteBrute + fraisInscription + autres;
  if (reduction + bourse > brut) return { erreur: "La réduction et la bourse dépassent le montant dû." } as const;
  let allegement = reduction + bourse;
  const scolariteNette = Math.max(0, scolariteBrute - allegement);
  allegement = Math.max(0, allegement - scolariteBrute);
  const autresNets = Math.max(0, autres - allegement);
  allegement = Math.max(0, allegement - autres);
  const inscriptionNette = Math.max(0, fraisInscription - allegement);
  const total = Math.round((inscriptionNette + autresNets + scolariteNette) * 100) / 100;
  return {
    erreur: null, fraisInscription, mensualite, mois, autres, reduction, bourse, scolariteBrute, brut,
    inscriptionNette, autresNets, scolariteNette, total, mensualiteNette: mois > 0 ? scolariteNette / mois : 0,
  } as const;
}

function Ligne({ libelle, valeur, fort = false, negatif = false }: { libelle: string; valeur: string; fort?: boolean; negatif?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${fort ? "border-t border-slate-200 pt-2.5 text-base font-black text-slate-900" : "text-sm text-slate-600"}`}>
      <span>{libelle}</span>
      <span className={`whitespace-nowrap tabular-nums ${negatif ? "text-emerald-700" : ""}`}>{valeur}</span>
    </div>
  );
}

function Bloc({ titre, onModifier, children }: { titre: string; onModifier?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-black text-slate-900">{titre}</h3>
        {onModifier && (
          <button type="button" onClick={onModifier} className="text-sm font-bold text-amber-700 underline-offset-2 hover:underline">Modifier</button>
        )}
      </div>
      {children}
    </section>
  );
}

function Suivi({ etape, onAller, max }: { etape: Etape; onAller: (e: Etape) => void; max: Etape }) {
  return (
    <nav aria-label="Étapes de l'inscription">
      <div className="flex items-center justify-between text-sm font-bold text-slate-600 md:hidden">
        <span>Étape {etape} sur 5 · <span className="text-slate-900">{ETAPES[etape - 1].titre}</span></span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 md:hidden">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(etape / 5) * 100}%` }} />
      </div>
      <ol className="hidden items-center gap-2 md:flex">
        {ETAPES.map((e, i) => {
          const fait = e.n < etape;
          const courant = e.n === etape;
          return (
            <li key={e.n} className="flex flex-1 items-center gap-2">
              <button type="button" disabled={e.n > max} onClick={() => onAller(e.n)}
                aria-current={courant ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed ${
                  courant ? "bg-slate-900 text-white" : fait ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${courant ? "bg-amber-500 text-black" : fait ? "bg-emerald-600 text-white" : "bg-slate-200"}`}>
                  {fait ? "✓" : e.n}
                </span>
                {e.titre}
              </button>
              {i < ETAPES.length - 1 && <span className="h-px flex-1 bg-slate-300" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function InscriptionPage() {
  const [options, setOptions] = useState<OptionsInscription | null>(null);
  const [chargement, setChargement] = useState(true);
  const [refus, setRefus] = useState("");
  const [etape, setEtape] = useState<Etape>(1);
  const [etapeMax, setEtapeMax] = useState<Etape>(1);
  const [mode, setMode] = useState<"nouveau" | "reinscription">("nouveau");
  const [eleve, setEleve] = useState<FormEleve>(ELEVE_VIDE);
  const [matriculeManuel, setMatriculeManuel] = useState(false);
  const [existant, setExistant] = useState<Eleve | null>(null);
  const [recherche, setRecherche] = useState("");
  const [trouves, setTrouves] = useState<Eleve[]>([]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoApercu, setPhotoApercu] = useState<string | null>(null);
  const [insc, setInsc] = useState({ school_year_id: "", class_id: "", niveau: "", serie: "", date: aujourdhui(), etat: "inscrit" });
  const [frais, setFrais] = useState<FormFrais>(FRAIS_VIDES);
  const [paiement, setPaiement] = useState({ montant: "", mode: "especes", reference: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [recentes, setRecentes] = useState<InscriptionRecente[]>([]);

  const chargerRecentes = useCallback(async () => {
    const r = await authFetch("/education/enrollments").catch(() => null);
    if (r?.ok) setRecentes((await r.json()).slice(0, 8));
  }, []);

  const choisirExistant = useCallback((e: Eleve) => {
    setExistant(e);
    setMode("reinscription");
    setTrouves([]);
    setRecherche("");
    setPhotoApercu(e.photo_url ? urlFichier(e.photo_url) : null);
    setPhoto(null);
  }, []);

  useEffect(() => {
    let actif = true;
    (async () => {
      const r = await authFetch("/education/inscriptions/options").catch(() => null);
      if (!actif) return;
      if (!r || !r.ok) {
        setRefus(r?.status === 403 ? "L'inscription est réservée à la direction, au secrétariat et à la comptabilité." : "Formulaire indisponible pour le moment.");
        setChargement(false);
        return;
      }
      const o: OptionsInscription = await r.json();
      setOptions(o);
      setInsc((p) => ({ ...p, school_year_id: o.annee_active_id ? String(o.annee_active_id) : "" }));
      setChargement(false);
      // Réinscription directe depuis la fiche d'un élève : ?eleve=<id>
      const id = Number(new URLSearchParams(window.location.search).get("eleve"));
      if (id) {
        const d = await authFetch(`/education/students/${id}/dossier`).catch(() => null);
        if (actif && d?.ok) choisirExistant((await d.json()).eleve);
      }
    })();
    chargerRecentes();
    return () => { actif = false; };
  }, [chargerRecentes, choisirExistant]);

  // Recherche d'un élève déjà connu (actif ou archivé) pour une réinscription.
  useEffect(() => {
    const terme = recherche.trim();
    if (mode !== "reinscription" || terme.length < 2) {
      queueMicrotask(() => setTrouves([]));
      return;
    }
    let actif = true;
    const minuterie = setTimeout(async () => {
      const q = encodeURIComponent(terme);
      const [a, b] = await Promise.all([
        authFetch(`/education/students?q=${q}`).catch(() => null),
        authFetch(`/education/students?q=${q}&archives=1`).catch(() => null),
      ]);
      const liste: Eleve[] = [...(a?.ok ? await a.json() : []), ...(b?.ok ? await b.json() : [])];
      if (actif) setTrouves(liste.slice(0, 12));
    }, 250);
    return () => { actif = false; clearTimeout(minuterie); };
  }, [recherche, mode]);

  useEffect(() => () => { if (photoApercu?.startsWith("blob:")) URL.revokeObjectURL(photoApercu); }, [photoApercu]);

  const calcul = useMemo(() => calculer(frais), [frais]);
  const modes = options?.modes_paiement?.length ? options.modes_paiement : MODES_PAR_DEFAUT;
  const classesAnnee = (options?.classes || []).filter((c) => !insc.school_year_id || !c.school_year_id || String(c.school_year_id) === insc.school_year_id);
  const classe = options?.classes.find((c) => String(c.id) === insc.class_id) || null;
  const annee = options?.annees.find((a) => String(a.id) === insc.school_year_id) || null;
  const verse = lireMontant(paiement.montant);
  const total = calcul.erreur ? 0 : calcul.total;
  // Raccourcis de paiement (sans doublon de montant).
  const raccourcis = [
    { libelle: "Rien aujourd'hui", valeur: 0 },
    ...(calcul.erreur ? [] : [{ libelle: "Inscription + frais", valeur: calcul.inscriptionNette + calcul.autresNets }]),
    { libelle: "Totalité", valeur: total },
  ].filter((r, i, t) => t.findIndex((x) => x.valeur === r.valeur) === i);

  const verifierEtape = (n: Etape): string => {
    if (n === 1) {
      if (mode === "reinscription") return existant ? "" : "Recherchez et choisissez l'élève à réinscrire.";
      if (!eleve.first_name.trim() || !eleve.last_name.trim()) return "Prénom et nom de l'élève obligatoires.";
      if (!eleve.gender) return "Indiquez le sexe de l'élève.";
      if (eleve.birth_date && eleve.birth_date > aujourdhui()) return "La date de naissance ne peut pas être dans le futur.";
      if (!eleve.guardian_name.trim() || !eleve.guardian_phone.trim()) return "Nom et téléphone du parent ou tuteur obligatoires.";
      if (eleve.email && !/^\S+@\S+\.\S+$/.test(eleve.email)) return "Adresse e-mail de l'élève invalide.";
      if (matriculeManuel && !/^[A-Za-z0-9][A-Za-z0-9/_-]{1,39}$/.test(eleve.matricule.trim())) return "Matricule manuel invalide (lettres, chiffres, - / _).";
    }
    if (n === 2) {
      if (!insc.school_year_id) return "Choisissez l'année scolaire.";
      if (!insc.class_id) return "Choisissez la classe de l'élève.";
    }
    if (n === 3 && calcul.erreur) return calcul.erreur;
    if (n === 4) {
      if (Number.isNaN(verse)) return "Montant payé invalide.";
      if (verse > total) return `Le montant payé dépasse le total dû (${formatFCFA(total)}).`;
      if (verse > 0 && !paiement.mode) return "Choisissez le mode de paiement.";
    }
    return "";
  };

  const aller = (n: Etape) => {
    // On ne saute pas une étape incomplète.
    for (let i = 1 as Etape; i < n; i = (i + 1) as Etape) {
      const e = verifierEtape(i);
      if (e) { setErreur(e); setEtape(i); return; }
    }
    setErreur("");
    setEtape(n);
    setEtapeMax((m) => (n > m ? n : m));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const suivant = () => {
    const e = verifierEtape(etape);
    if (e) return setErreur(e);
    if (etape < 5) aller((etape + 1) as Etape);
  };

  const recommencer = () => {
    setResultat(null);
    setMode("nouveau");
    setExistant(null);
    setEleve(ELEVE_VIDE);
    setMatriculeManuel(false);
    setPhoto(null);
    setPhotoApercu(null);
    setInsc((p) => ({ ...p, class_id: "", niveau: "", serie: "", date: aujourdhui(), etat: "inscrit" }));
    setFrais(FRAIS_VIDES);
    setPaiement({ montant: "", mode: "especes", reference: "" });
    setEtape(1);
    setEtapeMax(1);
    setErreur("");
    window.history.replaceState(null, "", "/education/inscriptions");
  };

  const valider = async () => {
    for (const n of [1, 2, 3, 4] as Etape[]) {
      const e = verifierEtape(n);
      if (e) { setErreur(e); setEtape(n); return; }
    }
    if (calcul.erreur) return;
    setEnvoi(true);
    setErreur("");
    const { matricule, ...identite } = eleve;
    const corps = {
      ...(mode === "reinscription" && existant ? { eleve_id: existant.id } : {
        eleve: { ...identite, gender: eleve.gender || null, birth_date: eleve.birth_date || null, ...(matriculeManuel ? { matricule: matricule.trim() } : {}) },
      }),
      inscription: {
        school_year_id: Number(insc.school_year_id), class_id: Number(insc.class_id), niveau: insc.niveau, serie: insc.serie,
        date: insc.date, etat: insc.etat,
      },
      frais: {
        inscription: calcul.fraisInscription, mensualite: calcul.mensualite, mois: calcul.mois, autres: calcul.autres,
        autres_libelle: frais.autres_libelle, reduction: calcul.reduction, bourse: calcul.bourse,
        premiere_echeance: frais.premiere_echeance || null,
      },
      paiement: { montant: verse, mode: verse > 0 ? paiement.mode : null, reference: paiement.reference },
    };
    try {
      const r = await authFetch("/education/inscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErreur(d?.error || "L'inscription n'a pas été enregistrée.");
        if (d?.code === "MATRICULE_PRIS" || d?.code === "DEJA_INSCRIT") setEtape(d.code === "MATRICULE_PRIS" ? 1 : 2);
        return;
      }
      const res: Resultat = d;
      if (photo) res.photo = await envoyerPhotoEleve(res.eleve.id, photo);
      setResultat(res);
      chargerRecentes();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErreur("Connexion impossible. Vos saisies sont conservées : réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  const doc = async (chemin: string, nom: string) => {
    const e = await ouvrirDocument(chemin, nom);
    if (e) setErreur(e);
  };

  if (chargement) {
    return <div className="flex min-h-[60vh] items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;
  }

  if (refus || !options) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <p className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-6 text-center font-semibold text-slate-700 shadow">{refus}</p>
      </div>
    );
  }

  const sansAnnee = options.annees.length === 0;
  const sansClasse = options.classes.length === 0;

  /* ---------- Écran final ---------- */
  if (resultat) {
    const e = resultat.eleve;
    const photoUrl = resultat.photo?.url || e.photo_url;
    const paye = Number(resultat.paiement?.amount || 0);
    return (
      <div className="min-h-screen bg-slate-100 px-4 pb-24 pt-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 aria-hidden="true" />
              <p className="font-black">{mode === "reinscription" ? "Réinscription enregistrée" : "Inscription enregistrée"}</p>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {photoUrl ? (
                   
                  <img src={urlFichier(photoUrl)} alt="" className="h-full w-full object-cover" />
                ) : <span className="flex h-full items-center justify-center text-slate-400"><GraduationCap /></span>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black text-slate-900">{e.first_name} {e.last_name}</p>
                <p className="font-mono text-sm font-bold text-slate-700">{e.matricule}</p>
                <p className="text-sm text-slate-500">{classe?.name} · {annee?.label} · Dossier {resultat.inscription.reference}</p>
              </div>
            </div>
            {resultat.photo?.erreur && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                Photo non enregistrée ({resultat.photo.erreur}) : ajoutez-la depuis la fiche de l&apos;élève.
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Total dû</p><p className="font-black text-slate-900">{formatFCFA(resultat.echeancier.total_amount)}</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-700">Payé</p><p className="font-black text-emerald-800">{formatFCFA(paye)}</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-700">Reste</p><p className="font-black text-amber-800">{formatFCFA(resultat.echeancier.reste)}</p></div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => doc(`/education/enrollments/${resultat.inscription.id}/pdf`, `inscription-${resultat.inscription.reference}.pdf`)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left font-bold text-slate-900 shadow-sm hover:bg-slate-50">
              <FileText className="text-slate-700" aria-hidden="true" /> Fiche d&apos;inscription (PDF)
            </button>
            {resultat.paiement && (
              <button type="button" onClick={() => doc(`/education/fee-payments/${resultat.paiement!.id}/receipt`, `recu-${resultat.paiement!.receipt_number}.pdf`)}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left font-bold text-slate-900 shadow-sm hover:bg-slate-50">
                <Receipt className="text-emerald-700" aria-hidden="true" /> Reçu {resultat.paiement.receipt_number}
              </button>
            )}
            <button type="button" onClick={() => doc(`/education/fee-plans/${resultat.echeancier.id}/schedule/pdf`, "echeancier.pdf")}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left font-bold text-slate-900 shadow-sm hover:bg-slate-50">
              <BadgeCheck className="text-amber-600" aria-hidden="true" /> Échéancier des paiements (PDF)
            </button>
            <Link href={`/education/eleves?eleve=${e.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 font-bold text-slate-900 shadow-sm hover:bg-slate-50">
              <IdCard className="text-blue-700" aria-hidden="true" /> Dossier, photo et badge
            </Link>
          </div>
          {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">{erreur}</p>}
          <button type="button" onClick={recommencer}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-black text-white">
            <UserPlus size={20} aria-hidden="true" /> Nouvelle inscription
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Assistant ---------- */
  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/education" className="text-sm font-bold text-slate-500 hover:text-slate-800">← Éducation</Link>
            <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Inscription</h1>
          </div>
          <Link href="/education/eleves" className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
            <Users size={16} aria-hidden="true" /> Élèves
          </Link>
        </div>

        {(sansAnnee || sansClasse) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            {sansAnnee ? (
              <>Aucune année scolaire : <Link href="/education/parametres" className="underline">créez l&apos;année en cours</Link> avant d&apos;inscrire.</>
            ) : (
              <>Aucune classe : <Link href="/education/classes" className="underline">créez vos classes</Link> pour affecter les élèves.</>
            )}
          </div>
        )}

        <Suivi etape={etape} onAller={aller} max={etapeMax} />

        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm md:p-6">
          {/* ---------- 1. Élève ---------- */}
          {etape === 1 && (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
                <button type="button" onClick={() => { setMode("nouveau"); setExistant(null); setPhotoApercu(null); setPhoto(null); }}
                  aria-pressed={mode === "nouveau"}
                  className={`rounded-lg py-2.5 ${mode === "nouveau" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Nouvel élève</button>
                <button type="button" onClick={() => setMode("reinscription")} aria-pressed={mode === "reinscription"}
                  className={`rounded-lg py-2.5 ${mode === "reinscription" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Réinscription</button>
              </div>

              {mode === "reinscription" ? (
                existant ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                        { }
                        {photoApercu ? <img src={photoApercu} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-slate-900">{existant.first_name} {existant.last_name}</p>
                        <p className="font-mono text-sm text-slate-700">{existant.matricule}</p>
                        <p className="text-sm text-slate-500">Classe actuelle : {existant.class_name || "—"}{existant.archived_at ? " · archivé" : ""}</p>
                      </div>
                      <button type="button" onClick={() => setExistant(null)} className="text-sm font-bold text-slate-600 underline">Changer</button>
                    </div>
                    <PhotoEleve apercu={photoApercu} onChange={(b) => { setPhoto(b); setPhotoApercu(b ? URL.createObjectURL(b) : existant.photo_url ? urlFichier(existant.photo_url) : null); }} />
                    <p className="text-sm text-slate-500">
                      Coordonnées à corriger ? <Link href={`/education/eleves?eleve=${existant.id}`} className="font-bold text-amber-700 underline">Modifier le dossier</Link>.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="recherche-eleve" className={etiquette}>Rechercher l&apos;élève (nom ou matricule)</label>
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-3.5 text-slate-400" aria-hidden="true" />
                      <input id="recherche-eleve" value={recherche} onChange={(e) => setRecherche(e.target.value)} autoComplete="off"
                        placeholder="Ex. Diarra, LPS-2026-0012" className={`${champ} pl-10`} />
                    </div>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 empty:hidden">
                      {trouves.map((t) => (
                        <li key={t.id}>
                          <button type="button" onClick={() => choisirExistant(t)} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50">
                            <span className="min-w-0">
                              <span className="block truncate font-bold text-slate-900">{t.first_name} {t.last_name}</span>
                              <span className="font-mono text-xs text-slate-500">{t.matricule} · {t.class_name || "sans classe"}{t.archived_at ? " · archivé" : ""}</span>
                            </span>
                            <ArrowRight size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {recherche.trim().length >= 2 && trouves.length === 0 && (
                      <p className="mt-2 text-sm text-slate-500">Aucun élève trouvé. S&apos;il est nouveau, choisissez « Nouvel élève ».</p>
                    )}
                  </div>
                )
              ) : (
                <>
                  <PhotoEleve apercu={photoApercu} onChange={(b) => { setPhoto(b); setPhotoApercu(b ? URL.createObjectURL(b) : null); }} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label htmlFor="prenom" className={etiquette}>Prénom *</label>
                      <input id="prenom" value={eleve.first_name} onChange={(e) => setEleve({ ...eleve, first_name: e.target.value })} autoComplete="off" className={champ} /></div>
                    <div><label htmlFor="nom" className={etiquette}>Nom *</label>
                      <input id="nom" value={eleve.last_name} onChange={(e) => setEleve({ ...eleve, last_name: e.target.value })} autoComplete="off" className={champ} /></div>
                    <div>
                      <span className={etiquette}>Sexe *</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[["M", "Garçon"], ["F", "Fille"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setEleve({ ...eleve, gender: v })} aria-pressed={eleve.gender === v}
                            className={`rounded-xl border py-3 font-bold ${eleve.gender === v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div><label htmlFor="naissance" className={etiquette}>Date de naissance</label>
                      <input id="naissance" type="date" max={aujourdhui()} value={eleve.birth_date} onChange={(e) => setEleve({ ...eleve, birth_date: e.target.value })} className={champ} /></div>
                    <div><label htmlFor="lieu" className={etiquette}>Lieu de naissance</label>
                      <input id="lieu" value={eleve.birth_place} onChange={(e) => setEleve({ ...eleve, birth_place: e.target.value })} className={champ} /></div>
                    <div><label htmlFor="adresse" className={etiquette}>Adresse</label>
                      <input id="adresse" value={eleve.address} onChange={(e) => setEleve({ ...eleve, address: e.target.value })} className={champ} /></div>
                  </div>

                  <fieldset className="rounded-2xl border border-slate-200 p-3">
                    <legend className="px-1 text-sm font-black text-slate-900">Parent ou tuteur</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label htmlFor="tuteur" className={etiquette}>Nom complet *</label>
                        <input id="tuteur" value={eleve.guardian_name} onChange={(e) => setEleve({ ...eleve, guardian_name: e.target.value })} className={champ} /></div>
                      <div><label htmlFor="lien" className={etiquette}>Lien</label>
                        <select id="lien" value={eleve.guardian_relation} onChange={(e) => setEleve({ ...eleve, guardian_relation: e.target.value })} className={champ}>
                          {(options.relations?.length ? options.relations : Object.keys(RELATIONS_FR)).map((r) => <option key={r} value={r}>{RELATIONS_FR[r] || r}</option>)}
                        </select></div>
                      <div><label htmlFor="tel-tuteur" className={etiquette}>Téléphone *</label>
                        <input id="tel-tuteur" type="tel" inputMode="tel" value={eleve.guardian_phone} onChange={(e) => setEleve({ ...eleve, guardian_phone: e.target.value })} placeholder="+223 …" className={champ} /></div>
                      <div><label htmlFor="mail-tuteur" className={etiquette}>E-mail (facultatif)</label>
                        <input id="mail-tuteur" type="email" inputMode="email" value={eleve.guardian_email} onChange={(e) => setEleve({ ...eleve, guardian_email: e.target.value })} className={champ} /></div>
                    </div>
                  </fieldset>

                  <details className="rounded-2xl border border-slate-200 p-3">
                    <summary className="cursor-pointer text-sm font-black text-slate-900">Contact de l&apos;élève et matricule</summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div><label htmlFor="tel-eleve" className={etiquette}>Téléphone de l&apos;élève</label>
                        <input id="tel-eleve" type="tel" inputMode="tel" value={eleve.phone} onChange={(e) => setEleve({ ...eleve, phone: e.target.value })} className={champ} /></div>
                      <div><label htmlFor="mail-eleve" className={etiquette}>E-mail de l&apos;élève (facultatif)</label>
                        <input id="mail-eleve" type="email" inputMode="email" value={eleve.email} onChange={(e) => setEleve({ ...eleve, email: e.target.value })} className={champ} /></div>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <p className="font-semibold text-slate-700">
                        Matricule attribué automatiquement{options.matricule.prefixe ? ` (${options.matricule.prefixe}-${new Date().getFullYear()}-0001…)` : ""}.
                      </p>
                      {options.matricule.manuel_autorise && (
                        <label className="mt-2 flex items-center gap-2 font-semibold text-slate-700">
                          <input type="checkbox" checked={matriculeManuel} onChange={(e) => setMatriculeManuel(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                          Saisir le matricule moi-même
                        </label>
                      )}
                      {matriculeManuel && (
                        <input aria-label="Matricule" value={eleve.matricule} onChange={(e) => setEleve({ ...eleve, matricule: e.target.value.toUpperCase() })}
                          placeholder="Ex. 2026-A-014" className={`${champ} mt-2 font-mono`} />
                      )}
                    </div>
                  </details>
                </>
              )}
            </>
          )}

          {/* ---------- 2. Inscription ---------- */}
          {etape === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label htmlFor="annee" className={etiquette}>Année scolaire *</label>
                <select id="annee" value={insc.school_year_id} onChange={(e) => setInsc({ ...insc, school_year_id: e.target.value, class_id: "" })} className={champ}>
                  <option value="">Choisir…</option>
                  {options.annees.map((a) => <option key={a.id} value={a.id}>{a.label}{a.id === options.annee_active_id ? " (en cours)" : ""}</option>)}
                </select></div>
              <div><label htmlFor="classe" className={etiquette}>Classe *</label>
                <select id="classe" value={insc.class_id}
                  onChange={(e) => {
                    const c = options.classes.find((x) => String(x.id) === e.target.value);
                    setInsc({ ...insc, class_id: e.target.value, niveau: c?.level || insc.niveau });
                  }} className={champ}>
                  <option value="">Choisir…</option>
                  {classesAnnee.map((c) => <option key={c.id} value={c.id}>{c.name}{typeof c.effectif === "number" ? ` — ${c.effectif} élève(s)` : ""}</option>)}
                </select></div>
              <div><label htmlFor="niveau" className={etiquette}>Niveau</label>
                <input id="niveau" value={insc.niveau} onChange={(e) => setInsc({ ...insc, niveau: e.target.value })} placeholder="Ex. 6e, Terminale" className={champ} /></div>
              <div><label htmlFor="serie" className={etiquette}>Série / section</label>
                <input id="serie" value={insc.serie} onChange={(e) => setInsc({ ...insc, serie: e.target.value })} placeholder="Ex. TSE, LL" className={champ} /></div>
              <div><label htmlFor="date-insc" className={etiquette}>Date d&apos;inscription</label>
                <input id="date-insc" type="date" value={insc.date} onChange={(e) => setInsc({ ...insc, date: e.target.value })} className={champ} /></div>
              <div>
                <span className={etiquette}>Statut</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["inscrit", "preinscrit"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setInsc({ ...insc, etat: s })} aria-pressed={insc.etat === s}
                      className={`rounded-xl border py-3 font-bold ${insc.etat === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}>
                      {ETATS_INSCRIPTION[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- 3. Frais ---------- */}
          {etape === 3 && (
            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["inscription", "Frais d'inscription"], ["mensualite", "Mensualité"],
                ] as const).map(([cle, lib]) => (
                  <div key={cle}><label htmlFor={`f-${cle}`} className={etiquette}>{lib} (FCFA)</label>
                    <input id={`f-${cle}`} inputMode="numeric" value={frais[cle]} onChange={(e) => setFrais({ ...frais, [cle]: e.target.value })} placeholder="0" className={champ} /></div>
                ))}
                <div><label htmlFor="f-mois" className={etiquette}>Nombre de mensualités</label>
                  <input id="f-mois" type="number" min={0} max={24} value={frais.mois} onChange={(e) => setFrais({ ...frais, mois: e.target.value })} className={champ} /></div>
                <div><label htmlFor="f-premiere" className={etiquette}>Première échéance</label>
                  <input id="f-premiere" type="date" value={frais.premiere_echeance} onChange={(e) => setFrais({ ...frais, premiere_echeance: e.target.value })} className={champ} /></div>
                <div><label htmlFor="f-autres" className={etiquette}>Autres frais (FCFA)</label>
                  <input id="f-autres" inputMode="numeric" value={frais.autres} onChange={(e) => setFrais({ ...frais, autres: e.target.value })} placeholder="0" className={champ} /></div>
                <div><label htmlFor="f-autres-lib" className={etiquette}>Libellé des autres frais</label>
                  <input id="f-autres-lib" value={frais.autres_libelle} onChange={(e) => setFrais({ ...frais, autres_libelle: e.target.value })} placeholder="Tenue, fournitures…" className={champ} /></div>
                <div><label htmlFor="f-reduction" className={etiquette}>Réduction (FCFA)</label>
                  <input id="f-reduction" inputMode="numeric" value={frais.reduction} onChange={(e) => setFrais({ ...frais, reduction: e.target.value })} placeholder="0" className={champ} /></div>
                <div><label htmlFor="f-bourse" className={etiquette}>Bourse (FCFA)</label>
                  <input id="f-bourse" inputMode="numeric" value={frais.bourse} onChange={(e) => setFrais({ ...frais, bourse: e.target.value })} placeholder="0" className={champ} /></div>
              </div>
              <section aria-label="Montant dû" className="h-fit rounded-2xl bg-slate-50 p-4">
                <p className="mb-1 text-sm font-black text-slate-900">Montant dû</p>
                {calcul.erreur ? (
                  <p role="alert" className="text-sm font-semibold text-red-700">{calcul.erreur}</p>
                ) : (
                  <>
                    <Ligne libelle="Inscription" valeur={formatFCFA(calcul.fraisInscription)} />
                    {calcul.autres > 0 && <Ligne libelle={frais.autres_libelle || "Autres frais"} valeur={formatFCFA(calcul.autres)} />}
                    <Ligne libelle={`Scolarité (${calcul.mois} × ${formatFCFA(calcul.mensualite)})`} valeur={formatFCFA(calcul.scolariteBrute)} />
                    {calcul.reduction > 0 && <Ligne libelle="Réduction" valeur={`− ${formatFCFA(calcul.reduction)}`} negatif />}
                    {calcul.bourse > 0 && <Ligne libelle="Bourse" valeur={`− ${formatFCFA(calcul.bourse)}`} negatif />}
                    <Ligne libelle="Total dû" valeur={formatFCFA(calcul.total)} fort />
                    {calcul.mois > 0 && calcul.scolariteNette > 0 && (
                      <p className="mt-2 text-xs text-slate-500">Soit {calcul.mois} mensualités d&apos;environ {formatFCFA(calcul.mensualiteNette)}.</p>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {/* ---------- 4. Paiement ---------- */}
          {etape === 4 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="verse" className={etiquette}>Montant payé aujourd&apos;hui (FCFA)</label>
                <input id="verse" inputMode="numeric" value={paiement.montant} onChange={(e) => setPaiement({ ...paiement, montant: e.target.value })} placeholder="0" className={`${champ} text-lg font-black`} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {raccourcis.map(({ libelle, valeur }) => (
                    <button key={libelle} type="button" onClick={() => setPaiement({ ...paiement, montant: valeur ? String(valeur) : "" })}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
                      {libelle}{valeur > 0 ? ` · ${formatFCFA(valeur)}` : ""}
                    </button>
                  ))}
                </div>
              </div>
              {verse > 0 && (
                <>
                  <div>
                    <span className={etiquette}>Mode de paiement</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {modes.map((m) => (
                        <button key={m.code} type="button" onClick={() => setPaiement({ ...paiement, mode: m.code })} aria-pressed={paiement.mode === m.code}
                          className={`rounded-xl border py-3 text-sm font-bold ${paiement.mode === m.code ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}>
                          {m.libelle}
                        </button>
                      ))}
                    </div>
                  </div>
                  {paiement.mode !== "especes" && (
                    <div><label htmlFor="ref" className={etiquette}>Référence de la transaction</label>
                      <input id="ref" value={paiement.reference} onChange={(e) => setPaiement({ ...paiement, reference: e.target.value })} placeholder="N° Wave, Orange Money, chèque…" className={champ} /></div>
                  )}
                </>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Total dû</p><p className="font-black text-slate-900">{formatFCFA(total)}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-700">Payé</p><p className="font-black text-emerald-800">{formatFCFA(Number.isNaN(verse) ? 0 : verse)}</p></div>
                <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-700">Reste</p><p className="font-black text-amber-800">{formatFCFA(Math.max(0, total - (Number.isNaN(verse) ? 0 : verse)))}</p></div>
              </div>
              <p className="text-sm text-slate-500">Un reçu numéroté est produit et l&apos;encaissement est inscrit en comptabilité.</p>
            </div>
          )}

          {/* ---------- 5. Validation ---------- */}
          {etape === 5 && (
            <div className="space-y-3">
              <Bloc titre="Élève" onModifier={() => aller(1)}>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    { }
                    {photoApercu ? <img src={photoApercu} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 text-sm text-slate-600">
                    {mode === "reinscription" && existant ? (
                      <>
                        <p className="font-black text-slate-900">{existant.first_name} {existant.last_name} · réinscription</p>
                        <p className="font-mono">{existant.matricule}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-black text-slate-900">{eleve.first_name} {eleve.last_name} · {eleve.gender === "F" ? "Fille" : "Garçon"}</p>
                        <p>{eleve.birth_date ? `Né(e) le ${dateFr(eleve.birth_date)}${eleve.birth_place ? ` à ${eleve.birth_place}` : ""}` : "Date de naissance non renseignée"}</p>
                        <p>{RELATIONS_FR[eleve.guardian_relation] || "Tuteur"} : {eleve.guardian_name} · {eleve.guardian_phone}</p>
                        <p>Matricule : {matriculeManuel ? <span className="font-mono">{eleve.matricule}</span> : "automatique"}</p>
                      </>
                    )}
                  </div>
                </div>
              </Bloc>
              <Bloc titre="Inscription" onModifier={() => aller(2)}>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-900">{classe?.name}</span> · {annee?.label}{insc.niveau ? ` · ${insc.niveau}` : ""}{insc.serie ? ` · série ${insc.serie}` : ""}
                  {" "}· {ETATS_INSCRIPTION[insc.etat]} le {dateFr(insc.date)}
                </p>
              </Bloc>
              <Bloc titre="Frais" onModifier={() => aller(3)}>
                {!calcul.erreur && (
                  <>
                    <Ligne libelle="Inscription" valeur={formatFCFA(calcul.inscriptionNette)} />
                    {calcul.autresNets > 0 && <Ligne libelle={frais.autres_libelle || "Autres frais"} valeur={formatFCFA(calcul.autresNets)} />}
                    {calcul.scolariteNette > 0 && <Ligne libelle={`Scolarité (${calcul.mois} mensualités)`} valeur={formatFCFA(calcul.scolariteNette)} />}
                    {calcul.reduction + calcul.bourse > 0 && <Ligne libelle="dont réduction et bourse" valeur={`− ${formatFCFA(calcul.reduction + calcul.bourse)}`} negatif />}
                    <Ligne libelle="Total dû" valeur={formatFCFA(calcul.total)} fort />
                  </>
                )}
              </Bloc>
              <Bloc titre="Paiement" onModifier={() => aller(4)}>
                <p className="text-sm text-slate-600">
                  {verse > 0
                    ? <>Encaissé aujourd&apos;hui : <span className="font-black text-slate-900">{formatFCFA(verse)}</span> ({modes.find((m) => m.code === paiement.mode)?.libelle}{paiement.reference ? ` · ${paiement.reference}` : ""}) · reste {formatFCFA(Math.max(0, total - verse))}</>
                    : <>Aucun paiement aujourd&apos;hui · reste {formatFCFA(total)}</>}
                </p>
              </Bloc>
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                La validation crée en une seule fois le dossier, le matricule, le code QR du badge, l&apos;affectation en classe, l&apos;échéancier
                {verse > 0 ? ", le reçu et l'écriture comptable" : ""}.
              </p>
            </div>
          )}

          {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">{erreur}</p>}

          {/* Navigation : barre fixe sur téléphone, en bas du formulaire ailleurs. */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:p-0 md:pt-2">
            {etape > 1 && (
              <button type="button" onClick={() => aller((etape - 1) as Etape)} disabled={envoi}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-3.5 font-bold text-slate-800">
                <ArrowLeft size={18} aria-hidden="true" /> <span className="hidden sm:inline">Précédent</span>
              </button>
            )}
            {etape < 5 ? (
              <button type="button" onClick={suivant}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3.5 font-black text-white">
                Suivant <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={valider} disabled={envoi || sansAnnee || sansClasse}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-black text-black disabled:opacity-60">
                {envoi ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
                {envoi ? "Enregistrement…" : mode === "reinscription" ? "Valider la réinscription" : "Valider l'inscription"}
              </button>
            )}
          </div>
        </div>

        {recentes.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900">Dernières inscriptions</h2>
              <Link href="/education/eleves" className="text-sm font-bold text-amber-700">Tous les élèves →</Link>
            </div>
            <ul className="mt-2 divide-y divide-slate-100">
              {recentes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{r.first_name} {r.last_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-mono">{r.reference}</span> · {r.class_name || "—"} · {dateFr(r.created_at)}
                      {r.enrollment_state && r.enrollment_state !== "inscrit" ? ` · ${ETATS_INSCRIPTION[r.enrollment_state] || r.enrollment_state}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => doc(`/education/enrollments/${r.id}/pdf`, `inscription-${r.reference}.pdf`)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-bold text-slate-700" aria-label={`Fiche PDF de ${r.first_name} ${r.last_name}`}>
                    <FileText size={15} aria-hidden="true" /> Fiche
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <RotateCcw size={12} aria-hidden="true" /> Un élève déjà inscrit cette année ne peut pas être inscrit deux fois.
        </p>
      </div>
    </div>
  );
}
