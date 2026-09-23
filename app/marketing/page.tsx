"use client";

/**
 * Marketing & Réseaux sociaux — comptes professionnels, calendrier éditorial,
 * publications et campagnes de l'entreprise. Distinct de MaliLink Social.
 *
 * Aucune API officielle n'est connectée : rien n'est publié ni lancé
 * automatiquement, et l'écran le dit. Une publication est déclarée « publiée »
 * avec le lien qui le prouve ; une campagne se crée et se paie sur la régie
 * officielle (lien fourni), puis ses étapes sont déclarées ici. Chaque bouton
 * suit le droit réel de l'utilisateur ; l'API le vérifie de son côté.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Info, Loader2,
  Megaphone, Paperclip, Plus, Send, Trash2, Users, Video, X,
} from "lucide-react";
import { authFetch } from "../lib/api";
import { formatFCFA } from "../lib/format";
import { usePermissions } from "../lib/permissions";

type Plateforme = { cle: string; label: string; lien: string; api: string; connecte: boolean };
type Regie = { cle: string; label: string; lien: string };
type Tableau = {
  comptes: { total: number };
  publications: { brouillons: number; programmes: number; publies: number; echoues: number };
  campagnes: Record<string, number>;
  prochaines: Array<{ id: number; title: string; network: string; scheduled_for: string }>;
  message_connecteurs: string;
  message_statistiques: string;
  plateformes: Plateforme[];
  regies: Regie[];
  objectifs: Record<string, string>;
};
type Compte = { id: number; network: string; display_name: string; handle: string; profile_url: string; status: string };
type Media = { id: number; kind: string; url: string };
type Publication = {
  id: number; title: string; body: string; network: string; status: string; scheduled_for: string | null;
  published_at: string | null; published_url: string; published_manually: boolean; failure_reason: string;
  account_name: string | null; created_at: string; medias: Media[];
};
type Campagne = {
  id: number; name: string; platform: string; objective: string; content: string; audience: string; zone: string;
  budget_total: string; start_date: string | null; end_date: string | null; destination_url: string; status: string;
  external_ref: string; status_note: string; declared_manually: boolean; manques: string[]; transitions: string[];
  regie: Regie | null;
};

const ONGLETS = [["tableau", "Tableau de bord"], ["calendrier", "Calendrier"], ["publications", "Publications"], ["campagnes", "Campagnes"], ["comptes", "Comptes"]] as const;
type Onglet = (typeof ONGLETS)[number][0];

const STATUT_POST: Record<string, [string, string]> = {
  brouillon: ["Brouillon", "bg-slate-100 text-slate-700"],
  programme: ["Programmée", "bg-blue-100 text-blue-800"],
  publie: ["Publiée", "bg-green-100 text-green-800"],
  echoue: ["Échouée", "bg-red-100 text-red-800"],
};
const STATUT_CAMPAGNE: Record<string, [string, string]> = {
  brouillon: ["Brouillon", "bg-slate-100 text-slate-700"],
  pret: ["Prête", "bg-amber-100 text-amber-900"],
  en_attente: ["En attente", "bg-blue-100 text-blue-800"],
  actif: ["Active", "bg-green-100 text-green-800"],
  termine: ["Terminée", "bg-slate-200 text-slate-800"],
  erreur: ["Erreur", "bg-red-100 text-red-800"],
};
const ACTION_CAMPAGNE: Record<string, string> = {
  pret: "Marquer prête", brouillon: "Repasser en brouillon", en_attente: "Déclarer lancée sur la régie",
  actif: "Déclarer active", termine: "Déclarer terminée", erreur: "Déclarer une erreur",
};
const ETAPES = ["brouillon", "pret", "en_attente", "actif", "termine"];

const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--ml-gold,#d4a23c)] focus:outline-none";
const jour = (d: Date) => d.toISOString().slice(0, 10);
const quand = (v: string | null) => (v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

type Demande = { titre: string; aide?: string; etiquette: string; lien?: { texte: string; href: string }; type?: string; valider: (v: string) => Promise<string | null> };

export default function MarketingPage() {
  const { can } = usePermissions();
  const [onglet, setOnglet] = useState<Onglet>("tableau");
  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [demande, setDemande] = useState<Demande | null>(null);
  const [formPost, setFormPost] = useState(false);
  const [formCampagne, setFormCampagne] = useState(false);
  const [formCompte, setFormCompte] = useState(false);

  const peut = {
    voirPublications: can("marketing.publications", "view"),
    creerPublication: can("marketing.publications", "create"),
    modifierPublication: can("marketing.publications", "update"),
    supprimerPublication: can("marketing.publications", "delete"),
    publier: can("marketing.publications", "validate"),
    voirCampagnes: can("marketing.campagnes", "view"),
    creerCampagne: can("marketing.campagnes", "create"),
    avancerCampagne: can("marketing.campagnes", "validate"),
    supprimerCampagne: can("marketing.campagnes", "delete"),
    voirComptes: can("marketing.comptes", "view"),
    creerCompte: can("marketing.comptes", "create"),
    supprimerCompte: can("marketing.comptes", "delete"),
  };

  const lire = async <T,>(chemin: string): Promise<T | null> => {
    const r = await authFetch(chemin, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setTableau(await lire<Tableau>("/marketing/tableau-de-bord"));
      if (peut.voirComptes) setComptes((await lire<{ comptes: Compte[] }>("/marketing/comptes"))?.comptes || []);
      if (peut.voirPublications) setPublications((await lire<{ publications: Publication[] }>("/marketing/publications"))?.publications || []);
      if (peut.voirCampagnes) setCampagnes((await lire<{ campagnes: Campagne[] }>("/marketing/campagnes"))?.campagnes || []);
    } finally {
      setChargement(false);
    }
  }, [peut.voirComptes, peut.voirPublications, peut.voirCampagnes]);

  useEffect(() => {
    charger();
  }, [charger]);

  const envoyer = async (chemin: string, methode: string, corps?: unknown) => {
    const r = await authFetch(chemin, {
      method: methode,
      headers: { "Content-Type": "application/json" },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  };

  const resultat = (ok: boolean, d: Record<string, string>, succes: string) => {
    setMessage(ok ? { ton: "ok", texte: d.precision ? `${succes} ${d.precision}` : succes } : { ton: "erreur", texte: d.error || "Action refusée." });
    if (ok) charger();
    return ok ? null : d.error || "Action refusée.";
  };

  const nomReseau = (cle: string) => tableau?.plateformes.find((p) => p.cle === cle)?.label || cle || "Réseau non défini";

  const onglets = ONGLETS.filter(([cle]) =>
    cle === "comptes" ? peut.voirComptes : cle === "campagnes" ? peut.voirCampagnes : cle === "publications" || cle === "calendrier" ? peut.voirPublications : true);

  // ── Actions ────────────────────────────────────────────────────────
  const declarerPubliee = (p: Publication) => setDemande({
    titre: `Marquer « ${p.title || "sans titre"} » comme publiée`,
    aide: "Publiez d'abord sur le réseau, puis collez ici le lien public de la publication : il sert de preuve. MaliLink ne publie pas à votre place.",
    etiquette: "Lien de la publication (https://…)",
    lien: p.network && tableau ? { texte: `Ouvrir ${nomReseau(p.network)}`, href: tableau.plateformes.find((x) => x.cle === p.network)?.lien || "" } : undefined,
    valider: async (v) => {
      const { ok, d } = await envoyer(`/marketing/publications/${p.id}/publier`, "POST", { published_url: v });
      return resultat(ok, d, "Publication enregistrée.");
    },
  });

  const declarerEchec = (p: Publication) => setDemande({
    titre: "Déclarer un échec de publication",
    etiquette: "Que s'est-il passé ?",
    valider: async (v) => {
      const { ok, d } = await envoyer(`/marketing/publications/${p.id}/echec`, "POST", { reason: v });
      return resultat(ok, d, "Échec enregistré.");
    },
  });

  const joindreMedia = async (p: Publication, fichier: File) => {
    const form = new FormData();
    form.append("fichier", fichier);
    const r = await authFetch(`/marketing/publications/${p.id}/medias`, { method: "POST", body: form });
    const d = await r.json().catch(() => ({}));
    resultat(r.ok, d, "Média ajouté.");
  };

  const avancerCampagne = (c: Campagne, vers: string) => {
    if (vers === "en_attente") {
      setDemande({
        titre: `Lancer « ${c.name} »`,
        aide: `Créez et payez la campagne sur ${c.regie?.label || "la régie officielle"} — MaliLink ne prend aucun paiement publicitaire. Collez ensuite sa référence ou son lien.`,
        etiquette: "Référence ou lien de la campagne sur la régie",
        lien: c.regie ? { texte: `Ouvrir ${c.regie.label}`, href: c.regie.lien } : undefined,
        valider: async (v) => {
          const { ok, d } = await envoyer(`/marketing/campagnes/${c.id}/statut`, "POST", { status: "en_attente", external_ref: v });
          return resultat(ok, d, "Campagne déclarée en attente.");
        },
      });
      return;
    }
    if (vers === "erreur") {
      setDemande({
        titre: "Déclarer une erreur",
        etiquette: "Que s'est-il passé ?",
        valider: async (v) => {
          const { ok, d } = await envoyer(`/marketing/campagnes/${c.id}/statut`, "POST", { status: "erreur", note: v });
          return resultat(ok, d, "Erreur enregistrée.");
        },
      });
      return;
    }
    envoyer(`/marketing/campagnes/${c.id}/statut`, "POST", { status: vers }).then(({ ok, d }) => resultat(ok, d, "Statut mis à jour."));
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-black">Marketing &amp; Réseaux sociaux</h1>
        <p className="mt-1 text-sm text-slate-600">Comptes professionnels, calendrier, publications et campagnes de l&apos;entreprise.</p>
      </header>

      {tableau && (
        <div className="mb-5 flex gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{tableau.message_connecteurs}</span>
        </div>
      )}

      <nav className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
        <div className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1">
          {onglets.map(([cle, libelle]) => (
            <button key={cle} onClick={() => setOnglet(cle)} aria-current={onglet === cle ? "page" : undefined}
              className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${onglet === cle ? "bg-white shadow-sm" : "text-slate-600"}`}>
              {libelle}
            </button>
          ))}
        </div>
      </nav>

      {message && (
        <div role="status" className={`mb-4 flex items-start justify-between gap-3 rounded-xl p-3 text-sm ${message.ton === "ok" ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"}`}>
          <span>{message.texte}</span>
          <button onClick={() => setMessage(null)} aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {chargement && !tableau ? (
        <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement…</p>
      ) : tableau && (
        <>
          {/* ═══════════════ TABLEAU DE BORD ═══════════════ */}
          {onglet === "tableau" && (
            <section className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Comptes", tableau.comptes.total],
                  ["Brouillons", tableau.publications.brouillons],
                  ["Programmées", tableau.publications.programmes],
                  ["Publiées", tableau.publications.publies],
                  ["Campagnes actives", tableau.campagnes.actif || 0],
                ].map(([libelle, valeur]) => (
                  <div key={libelle as string} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">{libelle}</div>
                    <div className="mt-1 text-2xl font-black">{valeur as number}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h2 className="mb-3 flex items-center gap-2 font-black"><CalendarDays className="h-5 w-5 text-slate-500" aria-hidden /> Prochaines publications</h2>
                  {tableau.prochaines.length === 0 ? <p className="text-sm text-slate-600">Aucune publication programmée.</p> : (
                    <ul className="space-y-2 text-sm">
                      {tableau.prochaines.map((p) => (
                        <li key={p.id} className="flex justify-between gap-3"><span className="truncate">{p.title || "Sans titre"} · {nomReseau(p.network)}</span><span className="shrink-0 text-slate-500">{quand(p.scheduled_for)}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <h2 className="mb-1 font-black">Statistiques</h2>
                  <p className="text-slate-600">{tableau.message_statistiques}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="mb-3 font-black">Plateformes</h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {tableau.plateformes.map((p) => (
                    <li key={p.cle} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="font-bold">{p.label}</div>
                      <div className="text-xs text-slate-500">Connecteur officiel : non installé</div>
                      <a href={p.lien} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline">
                        Ouvrir <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ═══════════════ CALENDRIER ═══════════════ */}
          {onglet === "calendrier" && peut.voirPublications && (
            <Calendrier publications={publications} nomReseau={nomReseau} />
          )}

          {/* ═══════════════ PUBLICATIONS ═══════════════ */}
          {onglet === "publications" && peut.voirPublications && (
            <section className="space-y-4">
              {peut.creerPublication && (
                <button onClick={() => setFormPost((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-500 px-4 font-black">
                  {formPost ? <><X className="h-4 w-4" aria-hidden /> Annuler</> : <><Plus className="h-4 w-4" aria-hidden /> Nouvelle publication</>}
                </button>
              )}
              {formPost && (
                <FormulairePublication comptes={comptes} nomReseau={nomReseau} onEnvoi={async (corps) => {
                  const { ok, d } = await envoyer("/marketing/publications", "POST", corps);
                  if (ok) setFormPost(false);
                  return resultat(ok, d, "Publication enregistrée.");
                }} />
              )}
              {publications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Aucune donnée disponible pour le moment.</div>
              ) : (
                <ul className="grid gap-3">
                  {publications.map((p) => {
                    const [libelle, classe] = STATUT_POST[p.status] || [p.status, ""];
                    const modifiable = p.status !== "publie";
                    return (
                      <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold">{p.title || "Sans titre"}</div>
                            <div className="text-xs text-slate-500">
                              {nomReseau(p.network)}{p.account_name ? ` · ${p.account_name}` : ""}{p.scheduled_for ? ` · prévue le ${quand(p.scheduled_for)}` : ""}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${classe}`}>{libelle}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{p.body}</p>
                        {p.medias.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {p.medias.map((m) => (
                              m.kind === "image"
                                ? <img key={m.id} src={`/api${m.url}`} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                                : <span key={m.id} className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100"><Video className="h-6 w-6 text-slate-500" aria-label="Vidéo" /></span>
                            ))}
                          </div>
                        )}
                        {p.status === "publie" && (
                          <p className="mt-2 text-xs text-green-800">
                            Publiée {p.published_manually ? "manuellement" : ""} le {quand(p.published_at)} ·{" "}
                            <a href={p.published_url} target="_blank" rel="noopener noreferrer" className="underline">voir sur le réseau</a>
                          </p>
                        )}
                        {p.status === "echoue" && p.failure_reason && <p className="mt-2 text-xs text-red-800">{p.failure_reason}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {peut.publier && modifiable && (
                            <button onClick={() => declarerPubliee(p)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-yellow-500 px-3 text-xs font-black">
                              <Send className="h-3.5 w-3.5" aria-hidden /> Marquer comme publiée
                            </button>
                          )}
                          {peut.modifierPublication && modifiable && (
                            <label className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold">
                              <Paperclip className="h-3.5 w-3.5" aria-hidden /> Joindre un média
                              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) joindreMedia(p, f); e.target.value = ""; }} />
                            </label>
                          )}
                          {peut.publier && ["brouillon", "programme"].includes(p.status) && (
                            <button onClick={() => declarerEchec(p)} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold">Déclarer un échec</button>
                          )}
                          {peut.supprimerPublication && (
                            <button onClick={async () => {
                              if (!window.confirm("Supprimer cette publication ?")) return;
                              const { ok, d } = await envoyer(`/marketing/publications/${p.id}`, "DELETE");
                              resultat(ok, d, "Publication supprimée.");
                            }} className="inline-flex min-h-9 items-center gap-1 px-3 text-xs font-semibold text-red-700">
                              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* ═══════════════ CAMPAGNES ═══════════════ */}
          {onglet === "campagnes" && peut.voirCampagnes && (
            <section className="space-y-4">
              <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Préparez la campagne ici. Sa création et son paiement se font sur la régie officielle ; ses étapes suivantes sont déclarées à la main.
              </p>
              {peut.creerCampagne && (
                <button onClick={() => setFormCampagne((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-500 px-4 font-black">
                  {formCampagne ? <><X className="h-4 w-4" aria-hidden /> Annuler</> : <><Plus className="h-4 w-4" aria-hidden /> Nouvelle campagne</>}
                </button>
              )}
              {formCampagne && (
                <FormulaireCampagne regies={tableau.regies} objectifs={tableau.objectifs} onEnvoi={async (corps) => {
                  const { ok, d } = await envoyer("/marketing/campagnes", "POST", corps);
                  if (ok) setFormCampagne(false);
                  return resultat(ok, d, "Campagne enregistrée en brouillon.");
                }} />
              )}
              {campagnes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Aucune donnée disponible pour le moment.</div>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {campagnes.map((c) => {
                    const [libelle, classe] = STATUT_CAMPAGNE[c.status] || [c.status, ""];
                    const rang = ETAPES.indexOf(c.status);
                    return (
                      <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-bold">{c.name}</div>
                            <div className="text-xs text-slate-500">{c.regie?.label || c.platform} · {tableau.objectifs[c.objective] || c.objective}</div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${classe}`}>{libelle}</span>
                        </div>
                        <ol className="mt-3 flex gap-1" aria-label="Étapes">
                          {ETAPES.map((e, i) => (
                            <li key={e} className={`h-1.5 flex-1 rounded-full ${c.status === "erreur" ? "bg-red-200" : i <= rang ? "bg-[var(--ml-gold,#d4a23c)]" : "bg-slate-200"}`} title={STATUT_CAMPAGNE[e][0]} />
                          ))}
                        </ol>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <dt className="text-slate-500">Budget</dt><dd className="font-semibold">{Number(c.budget_total) > 0 ? formatFCFA(c.budget_total) : "—"}</dd>
                          <dt className="text-slate-500">Période</dt><dd>{c.start_date ? `${c.start_date.slice(0, 10)} → ${c.end_date?.slice(0, 10) || "?"}` : "—"}</dd>
                          <dt className="text-slate-500">Zone</dt><dd className="truncate">{c.zone || "—"}</dd>
                          <dt className="text-slate-500">Référence régie</dt><dd className="truncate">{c.external_ref || "—"}</dd>
                        </dl>
                        {c.status === "brouillon" && c.manques.length > 0 && (
                          <p className="mt-2 text-xs text-amber-800">À compléter : {c.manques.join(", ")}.</p>
                        )}
                        {c.declared_manually && <p className="mt-2 text-xs text-slate-500">Étapes déclarées manuellement (aucune API publicitaire connectée).</p>}
                        {c.status_note && <p className="mt-1 text-xs text-red-800">{c.status_note}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {peut.avancerCampagne && c.transitions.map((vers) => (
                            <button key={vers} onClick={() => avancerCampagne(c, vers)}
                              className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${vers === "erreur" || vers === "brouillon" ? "border border-slate-300" : "bg-yellow-500 font-black"}`}>
                              {ACTION_CAMPAGNE[vers] || vers}
                            </button>
                          ))}
                          {c.regie && ["pret", "en_attente", "actif"].includes(c.status) && (
                            <a href={c.regie.lien} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold">
                              {c.regie.label} <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                          {peut.supprimerCampagne && ["brouillon", "pret", "erreur"].includes(c.status) && (
                            <button onClick={async () => {
                              if (!window.confirm("Supprimer cette campagne ?")) return;
                              const { ok, d } = await envoyer(`/marketing/campagnes/${c.id}`, "DELETE");
                              resultat(ok, d, "Campagne supprimée.");
                            }} className="inline-flex min-h-9 items-center gap-1 px-3 text-xs font-semibold text-red-700">
                              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* ═══════════════ COMPTES ═══════════════ */}
          {onglet === "comptes" && peut.voirComptes && (
            <section className="space-y-4">
              {peut.creerCompte && (
                <button onClick={() => setFormCompte((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-500 px-4 font-black">
                  {formCompte ? <><X className="h-4 w-4" aria-hidden /> Annuler</> : <><Plus className="h-4 w-4" aria-hidden /> Ajouter un compte</>}
                </button>
              )}
              {formCompte && (
                <FormulaireCompte plateformes={tableau.plateformes} onEnvoi={async (corps) => {
                  const { ok, d } = await envoyer("/marketing/comptes", "POST", corps);
                  if (ok) setFormCompte(false);
                  return resultat(ok, d, "Compte ajouté.");
                }} />
              )}
              {comptes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Aucune donnée disponible pour le moment.</div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {comptes.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-slate-500" aria-hidden /> <span className="truncate">{c.display_name}</span></div>
                        <div className="text-xs text-slate-500">{nomReseau(c.network)}{c.handle ? ` · ${c.handle}` : ""} · Non connecté</div>
                        {c.profile_url && <a href={c.profile_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">Voir le profil <ExternalLink className="h-3 w-3" aria-hidden /></a>}
                      </div>
                      {peut.supprimerCompte && (
                        <button onClick={async () => {
                          if (!window.confirm(`Retirer le compte « ${c.display_name} » ?`)) return;
                          const { ok, d } = await envoyer(`/marketing/comptes/${c.id}`, "DELETE");
                          resultat(ok, d, "Compte retiré.");
                        }} aria-label={`Retirer ${c.display_name}`} className="text-red-700"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {demande && <FenetreDemande demande={demande} onFermer={() => setDemande(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════ COMPOSANTS

function Calendrier({ publications, nomReseau }: { publications: Publication[]; nomReseau: (c: string) => string }) {
  const [mois, setMois] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const parJour = useMemo(() => {
    const m = new Map<string, Publication[]>();
    for (const p of publications) {
      const d = p.scheduled_for || p.published_at;
      if (!d) continue;
      const cle = jour(new Date(d));
      if (!m.has(cle)) m.set(cle, []);
      m.get(cle)!.push(p);
    }
    return m;
  }, [publications]);
  const cases = useMemo(() => {
    const premier = (mois.getDay() + 6) % 7; // lundi en premier
    const nb = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
    return [...Array(premier).fill(null), ...Array.from({ length: nb }, (_, i) => new Date(mois.getFullYear(), mois.getMonth(), i + 1))];
  }, [mois]);
  const duMois = cases.filter((c): c is Date => c !== null && parJour.has(jour(c)));
  const titre = mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} aria-label="Mois précédent" className="rounded-lg border border-slate-300 p-2"><ChevronLeft className="h-4 w-4" /></button>
        <h2 className="font-black capitalize">{titre}</h2>
        <button onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant" className="rounded-lg border border-slate-300 p-2"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Grille sur écran large */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-bold text-slate-500">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => <div key={j} className="py-2">{j}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cases.map((c, i) => (
            <div key={i} className="min-h-24 border-t border-slate-100 p-1.5 text-xs">
              {c && <div className="font-semibold text-slate-500">{c.getDate()}</div>}
              {c && (parJour.get(jour(c)) || []).map((p) => (
                <div key={p.id} className={`mt-1 truncate rounded px-1 py-0.5 ${STATUT_POST[p.status]?.[1] || ""}`} title={p.body}>
                  {p.title || nomReseau(p.network)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Agenda sur mobile */}
      <ul className="space-y-3 md:hidden">
        {duMois.length === 0 && <li className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">Rien de prévu ce mois-ci.</li>}
        {duMois.map((c) => (
          <li key={jour(c)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-bold capitalize text-slate-500">{c.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}</div>
            {(parJour.get(jour(c)) || []).map((p) => (
              <div key={p.id} className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{p.title || "Sans titre"} · {nomReseau(p.network)}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUT_POST[p.status]?.[1] || ""}`}>{STATUT_POST[p.status]?.[0]}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

type Envoi = (corps: Record<string, unknown>) => Promise<string | null>;

function useEnvoi(onEnvoi: Envoi) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const soumettre = async (e: React.FormEvent, corps: Record<string, unknown>) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur(await onEnvoi(corps));
    setEnvoi(false);
  };
  return { erreur, envoi, soumettre };
}

function Erreur({ texte }: { texte: string | null }) {
  return texte ? <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800 sm:col-span-2">{texte}</p> : null;
}

function FormulairePublication({ comptes, nomReseau, onEnvoi }: { comptes: Compte[]; nomReseau: (c: string) => string; onEnvoi: Envoi }) {
  const [f, setF] = useState({ title: "", body: "", account_id: "", scheduled_for: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  return (
    <form onSubmit={(e) => soumettre(e, {
      title: f.title, body: f.body, account_id: f.account_id || null,
      scheduled_for: f.scheduled_for ? new Date(f.scheduled_for).toISOString() : null,
      status: f.scheduled_for ? "programme" : "brouillon",
    })} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input placeholder="Titre interne" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${champ} sm:col-span-2`} />
      <textarea required rows={4} placeholder="Texte de la publication *" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} className={`${champ} sm:col-span-2`} />
      <select value={f.account_id} onChange={(e) => setF({ ...f, account_id: e.target.value })} className={champ} aria-label="Compte">
        <option value="">— Compte cible —</option>
        {comptes.map((c) => <option key={c.id} value={c.id}>{nomReseau(c.network)} — {c.display_name}</option>)}
      </select>
      <input type="datetime-local" value={f.scheduled_for} onChange={(e) => setF({ ...f, scheduled_for: e.target.value })} className={champ} aria-label="Date prévue" />
      <p className="text-xs text-slate-600 sm:col-span-2">
        Sans date : brouillon. Avec une date : programmée dans le calendrier. Images et vidéos se joignent après l&apos;enregistrement.
      </p>
      <Erreur texte={erreur} />
      <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black sm:col-span-2">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

function FormulaireCampagne({ regies, objectifs, onEnvoi }: { regies: Regie[]; objectifs: Record<string, string>; onEnvoi: Envoi }) {
  const [f, setF] = useState({ name: "", platform: regies[0]?.cle || "", objective: "notoriete", content: "", audience: "", zone: "", budget_total: "", start_date: "", end_date: "", destination_url: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => soumettre(e, { ...f, budget_total: f.budget_total || undefined, start_date: f.start_date || null, end_date: f.end_date || null })}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input required placeholder="Nom de la campagne *" value={f.name} onChange={maj("name")} className={`${champ} sm:col-span-2`} />
      <select value={f.platform} onChange={maj("platform")} className={champ} aria-label="Régie">
        {regies.map((r) => <option key={r.cle} value={r.cle}>{r.label}</option>)}
      </select>
      <select value={f.objective} onChange={maj("objective")} className={champ} aria-label="Objectif">
        {Object.entries(objectifs).map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
      </select>
      <textarea rows={3} placeholder="Contenu / message" value={f.content} onChange={maj("content")} className={`${champ} sm:col-span-2`} />
      <input placeholder="Audience (âge, centres d'intérêt…)" value={f.audience} onChange={maj("audience")} className={champ} />
      <input placeholder="Zone (ville, pays)" value={f.zone} onChange={maj("zone")} className={champ} />
      <input inputMode="numeric" placeholder="Budget total (FCFA)" value={f.budget_total} onChange={maj("budget_total")} className={champ} />
      <input type="url" placeholder="Lien de destination (https://…)" value={f.destination_url} onChange={maj("destination_url")} className={champ} />
      <label className="text-xs text-slate-600">Début<input type="date" value={f.start_date} onChange={maj("start_date")} className={champ} /></label>
      <label className="text-xs text-slate-600">Fin<input type="date" value={f.end_date} onChange={maj("end_date")} className={champ} /></label>
      <Erreur texte={erreur} />
      <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black sm:col-span-2">{envoi ? "Enregistrement…" : "Enregistrer en brouillon"}</button>
    </form>
  );
}

function FormulaireCompte({ plateformes, onEnvoi }: { plateformes: Plateforme[]; onEnvoi: Envoi }) {
  const [f, setF] = useState({ network: plateformes[0]?.cle || "facebook", display_name: "", handle: "", profile_url: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  return (
    <form onSubmit={(e) => soumettre(e, f)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <select value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })} className={champ} aria-label="Plateforme">
        {plateformes.map((p) => <option key={p.cle} value={p.cle}>{p.label}</option>)}
      </select>
      <input required placeholder="Nom affiché *" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} className={champ} />
      <input placeholder="Identifiant (@…)" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} className={champ} />
      <input type="url" placeholder="Lien du profil (https://…)" value={f.profile_url} onChange={(e) => setF({ ...f, profile_url: e.target.value })} className={champ} />
      <p className="text-xs text-slate-600 sm:col-span-2">Le compte est référencé, pas connecté : aucun mot de passe ni jeton n&apos;est demandé.</p>
      <Erreur texte={erreur} />
      <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black sm:col-span-2">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

function FenetreDemande({ demande, onFermer }: { demande: Demande; onFermer: () => void }) {
  const [valeur, setValeur] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="titre-demande">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setEnvoi(true);
          const refus = await demande.valider(valeur.trim());
          setEnvoi(false);
          if (refus) setErreur(refus); else onFermer();
        }}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="titre-demande" className="font-black">{demande.titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        {demande.aide && <p className="mb-3 text-sm text-slate-600">{demande.aide}</p>}
        {demande.lien?.href && (
          <a href={demande.lien.href} target="_blank" rel="noopener noreferrer" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold underline">
            {demande.lien.texte} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
        <label className="block text-sm font-semibold">
          {demande.etiquette}
          <input required autoFocus value={valeur} onChange={(e) => setValeur(e.target.value)} className={`${champ} mt-1`} />
        </label>
        {erreur && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">{erreur}</p>}
        <button disabled={envoi} className="mt-4 min-h-11 w-full rounded-xl bg-yellow-500 font-black">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Info className="h-3 w-3" aria-hidden /> Rien n&apos;est publié ni payé depuis MaliLink.</p>
      </form>
    </div>
  );
}
