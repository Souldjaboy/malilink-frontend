"use client";

/**
 * Caméras & Sécurité.
 *
 * Tableau de bord, caméras par site, sites (dont bureau / siège), enregistreurs
 * NVR/DVR, journal d'accès. Rien n'est simulé :
 *   - l'état « en ligne » vient d'un vrai test de connexion au port déclaré ;
 *   - pas de lecteur vidéo tant qu'aucune passerelle vidéo n'est installée ;
 *   - sans clé de chiffrement sur le serveur, la saisie d'identifiants est
 *     désactivée (le serveur la refuse de toute façon).
 * Chaque bouton n'apparaît que si l'utilisateur a le droit correspondant ;
 * l'API le vérifie de son côté.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Building2, Camera, CheckCircle2, CircleHelp, KeyRound, ListChecks,
  Loader2, MapPin, Plus, RefreshCw, Server, ShieldAlert, Trash2, WifiOff, X,
} from "lucide-react";
import { authFetch } from "../lib/api";
import { usePermissions } from "../lib/permissions";

type CameraRow = {
  id: number; code: string; name: string; location: string; connector_type: string;
  brand: string; model: string; host: string; port: number | null; status: string;
  online_status: string; last_checked_at: string | null; last_seen_at: string | null;
  last_check_error: string; warehouse_id: number | null; warehouse_name: string | null;
  recorder_name: string | null; identifiants_configures: boolean;
};
type Site = { id: number; code: string | null; name: string; type: string; cameras: number; hors_ligne: number; lieu_de_stock: boolean };
type Enregistreur = {
  id: number; name: string; kind: string; connector_type: string; brand: string; model: string;
  channels: number; host: string; port: number | null; online_status: string; warehouse_name: string | null;
  identifiants_configures: boolean;
};
type Tableau = {
  resume: { total: number; en_ligne: number; hors_ligne: number; inconnu: number; maintenance: number; sites: number };
  alertes: Array<{ niveau: string; message: string; camera_id?: number }>;
  chiffrement_actif: boolean;
  visualisation_disponible: boolean;
  message_visualisation: string;
  connecteurs: Array<{ cle: string; label: string; port: number | null }>;
};
type Evenement = { id: number; action: string; detail: string; created_at: string; camera: string | null; utilisateur: string | null };

const ONGLETS = [
  ["tableau", "Tableau de bord"], ["cameras", "Caméras"], ["sites", "Sites"],
  ["enregistreurs", "Enregistreurs"], ["journal", "Journal"],
] as const;
type Onglet = (typeof ONGLETS)[number][0];

const ETAT: Record<string, { libelle: string; classe: string; Icone: typeof CheckCircle2 }> = {
  en_ligne: { libelle: "Joignable", classe: "bg-green-100 text-green-800", Icone: CheckCircle2 },
  hors_ligne: { libelle: "Injoignable", classe: "bg-red-100 text-red-800", Icone: WifiOff },
  inconnu: { libelle: "Non testée", classe: "bg-slate-100 text-slate-700", Icone: CircleHelp },
};

const TYPE_SITE: Record<string, string> = {
  entrepot: "Entrepôt", magasin: "Magasin", depot: "Dépôt", point_de_vente: "Point de vente", bureau: "Bureau", siege: "Siège",
};

const ACTION_JOURNAL: Record<string, string> = {
  creation: "Création", modification: "Modification", suppression: "Suppression",
  test_joignabilite: "Test de joignabilité", identifiants_modifies: "Identifiants posés", identifiants_effaces: "Identifiants effacés",
};

const date = (v: string | null) => (v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");
const champ = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--ml-gold,#d4a23c)] focus:outline-none";

export default function CamerasPage() {
  const { can } = usePermissions();
  const [onglet, setOnglet] = useState<Onglet>("tableau");
  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [enregistreurs, setEnregistreurs] = useState<Enregistreur[]>([]);
  const [journal, setJournal] = useState<Evenement[]>([]);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enTest, setEnTest] = useState<number | null>(null);
  const [formCamera, setFormCamera] = useState(false);
  const [formSite, setFormSite] = useState(false);
  const [formEnregistreur, setFormEnregistreur] = useState(false);
  const [identifiantsDe, setIdentifiantsDe] = useState<CameraRow | null>(null);

  const peut = {
    creer: can("cameras", "create"),
    modifier: can("cameras", "update"),
    supprimer: can("cameras", "delete"),
    voirSites: can("cameras.sites", "view"),
    sites: can("cameras.sites", "create"),
    enregistreurs: can("cameras.enregistreurs", "view"),
    creerEnregistreur: can("cameras.enregistreurs", "create"),
    identifiants: can("cameras.identifiants", "update"),
    journal: can("cameras.identifiants", "view"),
  };

  const lire = async <T,>(chemin: string): Promise<T | null> => {
    const r = await authFetch(chemin, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [t, c, s] = await Promise.all([
        lire<Tableau>("/cameras/tableau-de-bord"),
        lire<{ cameras: CameraRow[] }>("/cameras"),
        lire<{ sites: Site[] }>("/cameras/sites"),
      ]);
      setTableau(t);
      setCameras(c?.cameras || []);
      setSites(s?.sites || []);
      if (peut.enregistreurs) setEnregistreurs((await lire<{ enregistreurs: Enregistreur[] }>("/cameras/enregistreurs"))?.enregistreurs || []);
      if (peut.journal) setJournal((await lire<{ journal: Evenement[] }>("/cameras/journal"))?.journal || []);
    } finally {
      setChargement(false);
    }
  }, [peut.enregistreurs, peut.journal]);

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

  const tester = async (cam: CameraRow) => {
    setEnTest(cam.id);
    setMessage(null);
    const { ok, d } = await envoyer(`/cameras/${cam.id}/verifier`, "POST");
    setEnTest(null);
    setMessage(ok
      ? { ton: "ok", texte: `${cam.name} : ${d.joignable ? `joignable (${d.duree_ms} ms)` : "injoignable"}. ${d.precision || ""}` }
      : { ton: "erreur", texte: `${cam.name} : ${d.error || "test impossible."}` });
    charger();
  };

  const supprimer = async (cam: CameraRow) => {
    if (!window.confirm(`Supprimer la caméra « ${cam.name} » ?`)) return;
    const { ok, d } = await envoyer(`/cameras/${cam.id}`, "DELETE");
    setMessage(ok ? { ton: "ok", texte: "Caméra supprimée." } : { ton: "erreur", texte: d.error || "Suppression refusée." });
    charger();
  };

  const parSite = useMemo(() => {
    const groupes = new Map<string, CameraRow[]>();
    for (const c of cameras) {
      const cle = c.warehouse_name || "Sans site rattaché";
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push(c);
    }
    return [...groupes.entries()];
  }, [cameras]);

  const onglets = ONGLETS.filter(([cle]) =>
    cle === "enregistreurs" ? peut.enregistreurs : cle === "journal" ? peut.journal : cle === "sites" ? peut.voirSites : true);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black">Caméras &amp; Sécurité</h1>
          <p className="mt-1 text-sm text-slate-600">Inventaire, sites et état de vos caméras de surveillance.</p>
        </div>
        <button onClick={charger} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold">
          <RefreshCw className="h-4 w-4" aria-hidden /> Actualiser
        </button>
      </header>

      <nav className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Sections">
        <div className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1">
          {onglets.map(([cle, libelle]) => (
            <button
              key={cle}
              onClick={() => setOnglet(cle)}
              aria-current={onglet === cle ? "page" : undefined}
              className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${onglet === cle ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
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
      ) : (
        <>
          {/* ═══════════════ TABLEAU DE BORD ═══════════════ */}
          {onglet === "tableau" && tableau && (
            <section className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Caméras", tableau.resume.total, Camera],
                  ["Joignables", tableau.resume.en_ligne, CheckCircle2],
                  ["Injoignables", tableau.resume.hors_ligne, WifiOff],
                  ["Non testées", tableau.resume.inconnu, CircleHelp],
                  ["Sites équipés", tableau.resume.sites, MapPin],
                ].map(([libelle, valeur, Icone]) => {
                  const I = Icone as typeof Camera;
                  return (
                    <div key={libelle as string} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        {libelle as string} <I className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="mt-1 text-2xl font-black">{valeur as number}</div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="mb-3 flex items-center gap-2 font-black"><AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden /> Alertes</h2>
                {tableau.alertes.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucune alerte.</p>
                ) : (
                  <ul className="space-y-2">
                    {tableau.alertes.map((a, i) => (
                      <li key={i} className={`rounded-xl px-3 py-2 text-sm ${a.niveau === "critique" ? "bg-red-50 text-red-900" : a.niveau === "attention" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}>
                        {a.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <h2 className="mb-1 font-black">Visualisation en direct</h2>
                  <p className="text-slate-600">{tableau.message_visualisation}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <h2 className="mb-1 font-black">Protocoles pris en charge</h2>
                  <p className="text-slate-600">
                    {tableau.connecteurs.map((c) => (c.port ? `${c.label} (port ${c.port})` : c.label)).join(" · ")}.
                    Les identifiants sont ceux que vous êtes autorisé à utiliser : MaliLink ne contourne jamais la protection d&apos;un équipement.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════ CAMÉRAS ═══════════════ */}
          {onglet === "cameras" && (
            <section className="space-y-5">
              {peut.creer && (
                <button onClick={() => setFormCamera((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-500 px-4 font-black">
                  {formCamera ? <><X className="h-4 w-4" aria-hidden /> Annuler</> : <><Plus className="h-4 w-4" aria-hidden /> Ajouter une caméra</>}
                </button>
              )}
              {formCamera && tableau && (
                <FormulaireCamera
                  sites={sites}
                  connecteurs={tableau.connecteurs}
                  onEnvoi={async (corps) => {
                    const { ok, d } = await envoyer("/cameras", "POST", corps);
                    if (!ok) return d.error || "Enregistrement refusé.";
                    setFormCamera(false);
                    setMessage({ ton: "ok", texte: "Caméra ajoutée." });
                    charger();
                    return null;
                  }}
                />
              )}

              {cameras.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
                  Aucune donnée disponible pour le moment.
                </div>
              ) : (
                parSite.map(([site, liste]) => (
                  <div key={site}>
                    <h2 className="mb-2 flex items-center gap-2 font-black"><MapPin className="h-4 w-4 text-slate-500" aria-hidden /> {site}</h2>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {liste.map((c) => {
                        const e = ETAT[c.online_status] || ETAT.inconnu;
                        return (
                          <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-bold">{c.name}</div>
                                <div className="text-xs text-slate-500">
                                  {[c.code, c.location, c.brand && `${c.brand} ${c.model || ""}`.trim()].filter(Boolean).join(" · ") || "—"}
                                </div>
                              </div>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${e.classe}`}>
                                <e.Icone className="h-3.5 w-3.5" aria-hidden /> {e.libelle}
                              </span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              <dt className="text-slate-500">Protocole</dt><dd className="font-semibold uppercase">{c.connector_type}</dd>
                              <dt className="text-slate-500">Adresse</dt><dd className="truncate font-semibold">{c.host ? `${c.host}${c.port ? `:${c.port}` : ""}` : "—"}</dd>
                              <dt className="text-slate-500">Dernier contact</dt><dd>{date(c.last_seen_at)}</dd>
                              <dt className="text-slate-500">Identifiants</dt><dd>{c.identifiants_configures ? "Enregistrés (chiffrés)" : "Non renseignés"}</dd>
                            </dl>
                            {c.last_check_error && c.online_status !== "en_ligne" && (
                              <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">{c.last_check_error}</p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {peut.modifier && (
                                <button onClick={() => tester(c)} disabled={enTest === c.id}
                                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold">
                                  {enTest === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                                  Tester
                                </button>
                              )}
                              {peut.identifiants && (
                                <button onClick={() => setIdentifiantsDe(c)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold">
                                  <KeyRound className="h-3.5 w-3.5" aria-hidden /> Identifiants
                                </button>
                              )}
                              {peut.supprimer && (
                                <button onClick={() => supprimer(c)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-red-700">
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </section>
          )}

          {/* ═══════════════ SITES ═══════════════ */}
          {onglet === "sites" && peut.voirSites && (
            <section className="space-y-4">
              {peut.sites && (
                <button onClick={() => setFormSite((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-500 px-4 font-black">
                  {formSite ? <><X className="h-4 w-4" aria-hidden /> Annuler</> : <><Plus className="h-4 w-4" aria-hidden /> Ajouter un site</>}
                </button>
              )}
              {formSite && (
                <FormulaireSite onEnvoi={async (corps) => {
                  const { ok, d } = await envoyer("/cameras/sites", "POST", corps);
                  if (!ok) return d.error || "Enregistrement refusé.";
                  setFormSite(false);
                  setMessage({ ton: "ok", texte: "Site ajouté." });
                  charger();
                  return null;
                }} />
              )}
              <p className="text-sm text-slate-600">
                Vos magasins et entrepôts sont vos sites. Un bureau ou un siège ajouté ici porte des caméras mais n&apos;apparaît pas dans le stock.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sites.map((s) => (
                  <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-slate-500" aria-hidden /> <span className="truncate">{s.name}</span></div>
                    <div className="mt-1 text-xs text-slate-500">{TYPE_SITE[s.type] || s.type}{s.code ? ` · ${s.code}` : ""}{s.lieu_de_stock ? "" : " · hors stock"}</div>
                    <div className="mt-2 text-sm">{s.cameras} caméra(s){s.hors_ligne ? <span className="text-red-700"> · {s.hors_ligne} injoignable(s)</span> : ""}</div>
                  </li>
                ))}
              </ul>
              {sites.length === 0 && <p className="text-sm text-slate-600">Aucune donnée disponible pour le moment.</p>}
            </section>
          )}

          {/* ═══════════════ ENREGISTREURS ═══════════════ */}
          {onglet === "enregistreurs" && peut.enregistreurs && (
            <section className="space-y-4">
              {peut.creerEnregistreur && tableau && (
                <button onClick={() => setFormEnregistreur((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-500 px-4 font-black">
                  {formEnregistreur ? <><X className="h-4 w-4" aria-hidden /> Annuler</> : <><Plus className="h-4 w-4" aria-hidden /> Ajouter un enregistreur</>}
                </button>
              )}
              {formEnregistreur && tableau && (
                <FormulaireEnregistreur sites={sites} connecteurs={tableau.connecteurs} onEnvoi={async (corps) => {
                  const { ok, d } = await envoyer("/cameras/enregistreurs", "POST", corps);
                  if (!ok) return d.error || "Enregistrement refusé.";
                  setFormEnregistreur(false);
                  setMessage({ ton: "ok", texte: "Enregistreur ajouté." });
                  charger();
                  return null;
                }} />
              )}
              <ul className="grid gap-3 md:grid-cols-2">
                {enregistreurs.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 font-bold"><Server className="h-4 w-4 text-slate-500" aria-hidden /> <span className="truncate">{r.name}</span></div>
                    <div className="mt-1 text-xs text-slate-500">
                      {r.kind.toUpperCase()} · {r.connector_type.toUpperCase()}{r.channels ? ` · ${r.channels} voies` : ""}{r.warehouse_name ? ` · ${r.warehouse_name}` : ""}
                    </div>
                    <div className="mt-1 truncate text-xs">{r.host ? `${r.host}${r.port ? `:${r.port}` : ""}` : "Adresse non renseignée"}</div>
                  </li>
                ))}
              </ul>
              {enregistreurs.length === 0 && <p className="text-sm text-slate-600">Aucune donnée disponible pour le moment.</p>}
            </section>
          )}

          {/* ═══════════════ JOURNAL ═══════════════ */}
          {onglet === "journal" && peut.journal && (
            <section>
              <p className="mb-3 flex items-center gap-2 text-sm text-slate-600"><ListChecks className="h-4 w-4" aria-hidden /> Les 100 derniers événements.</p>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {journal.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                    <span><strong>{ACTION_JOURNAL[e.action] || e.action}</strong>{e.camera ? ` — ${e.camera}` : ""}{e.detail && e.action === "test_joignabilite" ? ` (${e.detail})` : ""}</span>
                    <span className="text-xs text-slate-500">{e.utilisateur || "—"} · {date(e.created_at)}</span>
                  </li>
                ))}
                {journal.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-600">Aucune donnée disponible pour le moment.</li>}
              </ul>
            </section>
          )}
        </>
      )}

      {identifiantsDe && tableau && (
        <FenetreIdentifiants
          camera={identifiantsDe}
          chiffrementActif={tableau.chiffrement_actif}
          onFermer={() => setIdentifiantsDe(null)}
          onEnvoi={async (corps) => {
            const { ok, d } = await envoyer(`/cameras/${identifiantsDe.id}/identifiants`, "PUT", corps);
            if (!ok) return d.error || "Enregistrement refusé.";
            setIdentifiantsDe(null);
            setMessage({ ton: "ok", texte: "Identifiants enregistrés, chiffrés. Ils ne seront plus jamais affichés." });
            charger();
            return null;
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════ FORMULAIRES

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

function FormulaireCamera({ sites, connecteurs, onEnvoi }: { sites: Site[]; connecteurs: Tableau["connecteurs"]; onEnvoi: Envoi }) {
  const [f, setF] = useState({ name: "", code: "", warehouse_id: "", location: "", connector_type: "onvif", host: "", port: "", brand: "", model: "", observations: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  const portDefaut = connecteurs.find((c) => c.cle === f.connector_type)?.port;
  return (
    <form onSubmit={(e) => soumettre(e, { ...f, warehouse_id: f.warehouse_id || null, port: f.port || undefined })}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input required placeholder="Nom de la caméra *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={champ} />
      <input placeholder="Code (ex. CAM-ENT-01)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className={champ} />
      <select value={f.warehouse_id} onChange={(e) => setF({ ...f, warehouse_id: e.target.value })} className={champ}>
        <option value="">— Site —</option>
        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input placeholder="Emplacement (ex. Entrée, caisse)" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={champ} />
      <select value={f.connector_type} onChange={(e) => setF({ ...f, connector_type: e.target.value, port: "" })} className={champ} aria-label="Protocole">
        {connecteurs.map((c) => <option key={c.cle} value={c.cle}>{c.label}</option>)}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <input placeholder="Adresse IP publique ou DDNS" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} className={`${champ} col-span-2`} />
        <input inputMode="numeric" placeholder={portDefaut ? String(portDefaut) : "Port"} value={f.port} onChange={(e) => setF({ ...f, port: e.target.value })} className={champ} aria-label="Port" />
      </div>
      <input placeholder="Marque" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className={champ} />
      <input placeholder="Modèle" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} className={champ} />
      <textarea rows={2} placeholder="Observations" value={f.observations} onChange={(e) => setF({ ...f, observations: e.target.value })} className={`${champ} sm:col-span-2`} />
      {erreur && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800 sm:col-span-2">{erreur}</p>}
      <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black sm:col-span-2">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

function FormulaireSite({ onEnvoi }: { onEnvoi: Envoi }) {
  const [f, setF] = useState({ name: "", type: "bureau", code: "", address: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  return (
    <form onSubmit={(e) => soumettre(e, f)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input required placeholder="Nom du site *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={champ} />
      <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={champ} aria-label="Type de site">
        {Object.entries(TYPE_SITE).map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
      </select>
      <input placeholder="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className={champ} />
      <input placeholder="Adresse" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={champ} />
      {erreur && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800 sm:col-span-2">{erreur}</p>}
      <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black sm:col-span-2">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

function FormulaireEnregistreur({ sites, connecteurs, onEnvoi }: { sites: Site[]; connecteurs: Tableau["connecteurs"]; onEnvoi: Envoi }) {
  const [f, setF] = useState({ name: "", kind: "nvr", connector_type: "hikvision", warehouse_id: "", host: "", port: "", channels: "", brand: "", model: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  return (
    <form onSubmit={(e) => soumettre(e, { ...f, warehouse_id: f.warehouse_id || null, port: f.port || undefined })}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input required placeholder="Nom *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={champ} />
      <div className="grid grid-cols-2 gap-2">
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={champ} aria-label="Type"><option value="nvr">NVR</option><option value="dvr">DVR</option></select>
        <select value={f.connector_type} onChange={(e) => setF({ ...f, connector_type: e.target.value })} className={champ} aria-label="Protocole">
          {connecteurs.map((c) => <option key={c.cle} value={c.cle}>{c.label}</option>)}
        </select>
      </div>
      <select value={f.warehouse_id} onChange={(e) => setF({ ...f, warehouse_id: e.target.value })} className={champ}>
        <option value="">— Site —</option>
        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input inputMode="numeric" placeholder="Nombre de voies" value={f.channels} onChange={(e) => setF({ ...f, channels: e.target.value })} className={champ} />
      <input placeholder="Adresse IP publique ou DDNS" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} className={champ} />
      <input inputMode="numeric" placeholder="Port" value={f.port} onChange={(e) => setF({ ...f, port: e.target.value })} className={champ} />
      {erreur && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800 sm:col-span-2">{erreur}</p>}
      <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black sm:col-span-2">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

function FenetreIdentifiants({ camera, chiffrementActif, onFermer, onEnvoi }: {
  camera: CameraRow; chiffrementActif: boolean; onFermer: () => void; onEnvoi: Envoi;
}) {
  const [f, setF] = useState({ username: "", password: "", stream_path: "" });
  const { erreur, envoi, soumettre } = useEnvoi(onEnvoi);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="titre-identifiants">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="titre-identifiants" className="font-black">Identifiants — {camera.name}</h2>
          <button onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        {!chiffrementActif ? (
          <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
            Le chiffrement des secrets n&apos;est pas configuré sur le serveur : l&apos;enregistrement d&apos;un mot de passe est refusé.
            L&apos;administrateur de la plateforme doit d&apos;abord définir la clé de chiffrement.
          </p>
        ) : (
          <form onSubmit={(e) => soumettre(e, f)} className="grid gap-3">
            <p className="text-xs text-slate-600">
              Enregistrés chiffrés (AES-256-GCM). Ils ne seront plus jamais affichés : pour les changer, saisissez-les à nouveau.
            </p>
            <input placeholder="Utilisateur" autoComplete="off" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} className={champ} />
            <input type="password" placeholder="Mot de passe" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={champ} />
            <input placeholder="Chemin du flux (ex. /Streaming/Channels/101)" autoComplete="off" value={f.stream_path} onChange={(e) => setF({ ...f, stream_path: e.target.value })} className={champ} />
            {erreur && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{erreur}</p>}
            <button disabled={envoi} className="min-h-11 rounded-xl bg-yellow-500 font-black">{envoi ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
