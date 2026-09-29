"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Eye, EyeOff, Globe, Info, MapPin, Phone, Plus, SearchCheck, Trash2, Upload } from "lucide-react";
import { authFetch } from "../../lib/api";
import { usePermissions } from "../../lib/permissions";
import { productConfig } from "../../lib/product-config";

/**
 * PROFIL PUBLIC MALILINK — édition par l'entreprise.
 *
 * Rien n'est publié sans la case « Publier ». Les informations déjà saisies
 * dans les Paramètres sont PROPOSÉES (bouton « Reprendre »), jamais copiées
 * d'office : ce qui devient public est choisi champ par champ.
 */

type Service = { name: string; description: string };
type Reseau = { key: string; label: string; domains: string[] };

type Profil = {
  exists: boolean;
  slug: string;
  description: string;
  logo_url: string;
  website: string;
  public_phone: string;
  public_email: string;
  country: string;
  region: string;
  city: string;
  quartier: string;
  address_line: string;
  opening_hours: string;
  social_links: Record<string, string>;
  services: Service[];
  is_public: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_products: boolean;
  listed_in_directory: boolean;
  published_at: string | null;
  public_url: string;
  activity: { key: string; label: string };
  company_name: string;
};

type Suggestions = Partial<Omit<Profil, "social_links">> & { social_links?: Record<string, string> };

type Reponse = {
  profile: Profil;
  suggestions: Suggestions;
  published_products: number;
  networks: Reseau[];
  company_active: boolean;
  description_min: number;
  missing_to_publish: string[];
};

const champ = "w-full rounded-xl border border-gray-300 p-3 text-black focus:border-[var(--ml-blue-deep,#0a1330)] focus:outline-none";
const etiquette = "mb-1 block text-sm font-bold text-gray-800";

function domaineSite() {
  try {
    return new URL(productConfig.siteUrl).host;
  } catch {
    return "malilinkglobal.com";
  }
}

export default function ProfilPublicPage() {
  const { can } = usePermissions();
  const modifiable = can("parametres", "update");

  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [envoiLogo, setEnvoiLogo] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const r = await authFetch("/company/public-profile", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) {
        setErreurs([d?.error || "Impossible de lire le profil public."]);
        return;
      }
      setDonnees(d);
      setProfil(d.profile);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const maj = <K extends keyof Profil>(cle: K, valeur: Profil[K]) =>
    setProfil((p) => (p ? { ...p, [cle]: valeur } : p));

  /* Ne remplit que les champs encore vides : ce que l'utilisateur a déjà
     saisi ici n'est jamais écrasé. Rien n'est enregistré à ce stade. */
  const reprendre = () => {
    if (!profil || !donnees) return;
    const s = donnees.suggestions;
    const suite = { ...profil };
    (["slug", "description", "logo_url", "website", "public_phone", "public_email", "city", "country", "address_line", "opening_hours"] as const)
      .forEach((k) => {
        const v = s[k];
        if (!suite[k] && typeof v === "string" && v) (suite as Record<string, unknown>)[k] = v;
      });
    const liens = { ...suite.social_links };
    Object.entries(s.social_links || {}).forEach(([k, v]) => { if (!liens[k] && v) liens[k] = v; });
    suite.social_links = liens;
    setProfil(suite);
    setMessage("Informations reprises des Paramètres. Vérifiez-les, puis enregistrez : rien n'est publié tant que « Publier » n'est pas coché.");
  };

  const envoyerLogo = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoiLogo(true);
    setErreurs([]);
    try {
      const form = new FormData();
      form.append("logo", fichier);
      const r = await authFetch("/upload-logo", { method: "POST", body: form });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.logo_url) throw new Error(d?.error || "Envoi du logo impossible.");
      maj("logo_url", d.logo_url);
    } catch (e) {
      setErreurs([e instanceof Error ? e.message : "Envoi du logo impossible."]);
    } finally {
      setEnvoiLogo(false);
    }
  };

  const enregistrer = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    if (!profil) return;
    setEnvoi(true);
    setErreurs([]);
    setMessage("");
    try {
      const r = await authFetch("/company/public-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profil,
          services: profil.services.filter((s) => s.name.trim()),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErreurs(d?.errors || (d?.missing ? [d.error] : [d?.error || "Enregistrement impossible."]));
        // Le message d'erreur est en haut de page : l'y amener.
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setProfil(d.profile);
      setDonnees((x) => (x ? { ...x, profile: d.profile, missing_to_publish: [] } : x));
      setMessage(d.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setEnvoi(false);
    }
  };

  const manquants = useMemo(() => {
    if (!profil || !donnees) return [];
    const m: string[] = [];
    if (!profil.slug) m.push("adresse de la page");
    if (profil.description.trim().length < donnees.description_min) m.push(`description (${donnees.description_min} caractères minimum)`);
    if (!profil.city.trim()) m.push("ville");
    return m;
  }, [profil, donnees]);

  if (chargement) {
    return <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">Chargement du profil public…</div>;
  }
  if (!profil || !donnees) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
        <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{erreurs[0] || "Profil public indisponible."}</p>
      </div>
    );
  }

  const lienPublic = profil.public_url;
  const criteresSeo = [
    { label: "Profil publié", ok: profil.is_public },
    { label: "Présent dans l’annuaire MaliLink", ok: profil.listed_in_directory },
    { label: "Description détaillée", ok: profil.description.trim().length >= 120 },
    { label: "Logo ajouté", ok: Boolean(profil.logo_url) },
    { label: "Ville et adresse renseignées", ok: Boolean(profil.city && profil.address_line) },
    { label: "Téléphone public", ok: Boolean(profil.show_phone && profil.public_phone) },
    { label: "Site ou réseau officiel", ok: Boolean(profil.website || Object.values(profil.social_links).some(Boolean)) },
    { label: "Au moins un service", ok: profil.services.some((s) => s.name.trim()) },
  ];
  const scoreSeo = Math.round(criteresSeo.filter((c) => c.ok).length / criteresSeo.length * 100);

  const copierLien = async () => {
    if (!lienPublic) return;
    await navigator.clipboard.writeText(new URL(lienPublic, productConfig.siteUrl).toString());
    setMessage("Lien public copié.");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black md:p-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-3 text-sm text-gray-600">
          <Link href="/parametres" className="hover:underline">Paramètres</Link> › Profil public
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">Profil public MaliLink</h1>
            <p className="mt-1 max-w-2xl text-gray-600">
              Une page publique pour {profil.company_name || "votre entreprise"}{" "}
              et, si vous le souhaitez, une fiche dans l&apos;annuaire des entreprises. Vous choisissez ce qui est affiché.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-bold ${
              profil.is_public ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
            }`}
          >
            {profil.is_public ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            {profil.is_public
              ? `Publié${profil.published_at ? ` le ${new Date(profil.published_at).toLocaleDateString("fr-FR")}` : ""}`
              : "Non publié"}
          </span>
        </div>

        {message && <p className="mt-4 rounded-xl bg-green-50 p-4 font-bold text-green-800" role="status">{message}</p>}
        {erreurs.length > 0 && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-800" role="alert">
            <ul className="list-disc space-y-1 pl-5 font-bold">
              {erreurs.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}
        {!modifiable && (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-800">
            Lecture seule : il faut le droit « Modifier » sur Paramètres pour changer le profil public.
          </p>
        )}
        {!donnees.company_active && (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-800">
            Votre compte entreprise n&apos;est pas actif : même publié, le profil n&apos;est pas visible.
          </p>
        )}

        <form onSubmit={enregistrer} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <fieldset disabled={!modifiable || envoi} className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl bg-white p-5 shadow md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-black">Identité</h2>
                <button type="button" onClick={reprendre} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50">
                  Reprendre mes informations des Paramètres
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="slug" className={etiquette}>Adresse de la page</label>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span className="shrink-0 text-sm text-gray-500">{domaineSite()}/boutique/</span>
                    <input
                      id="slug"
                      value={profil.slug}
                      onChange={(e) => maj("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder={donnees.suggestions.slug || "mon-entreprise"}
                      className={`${champ} min-w-0 flex-1`}
                      maxLength={60}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Lettres minuscules, chiffres et tirets. Changer l&apos;adresse casse les liens déjà partagés.</p>
                </div>

                <div>
                  <label htmlFor="description" className={etiquette}>Présentation</label>
                  <textarea
                    id="description"
                    rows={5}
                    value={profil.description}
                    onChange={(e) => maj("description", e.target.value)}
                    placeholder="Ce que fait votre entreprise, pour qui, ce qui la distingue."
                    className={champ}
                    maxLength={1500}
                  />
                  <p className={`mt-1 text-xs ${profil.description.trim().length < donnees.description_min ? "text-amber-700" : "text-gray-500"}`}>
                    {profil.description.trim().length} / 1500 caractères — {donnees.description_min} minimum pour publier.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
                    {profil.logo_url ? (
                      <img src={profil.logo_url} alt="Aperçu du logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Pas de logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50">
                      <Upload size={16} aria-hidden="true" />
                      {envoiLogo ? "Envoi…" : "Envoyer un logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => envoyerLogo(e.target.files?.[0])} />
                    </label>
                    <input
                      aria-label="Adresse du logo"
                      value={profil.logo_url}
                      onChange={(e) => maj("logo_url", e.target.value)}
                      placeholder="ou adresse https du logo"
                      className={champ}
                    />
                  </div>
                </div>

                <p className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Activité affichée : <strong>{profil.activity.label}</strong>. Elle suit le type d&apos;activité de
                    l&apos;entreprise (modifiable dans <Link href="/parametres" className="underline">Paramètres</Link>).
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow md:p-6">
              <h2 className="text-xl font-black">Localisation</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className={etiquette}>Ville *</label>
                  <input id="city" value={profil.city} onChange={(e) => maj("city", e.target.value)} className={champ} maxLength={80} placeholder="Bamako" />
                </div>
                <div>
                  <label htmlFor="quartier" className={etiquette}>Quartier</label>
                  <input id="quartier" value={profil.quartier} onChange={(e) => maj("quartier", e.target.value)} className={champ} maxLength={120} />
                </div>
                <div>
                  <label htmlFor="region" className={etiquette}>Région</label>
                  <input id="region" value={profil.region} onChange={(e) => maj("region", e.target.value)} className={champ} maxLength={80} />
                </div>
                <div>
                  <label htmlFor="country" className={etiquette}>Pays</label>
                  <input id="country" value={profil.country} onChange={(e) => maj("country", e.target.value)} className={champ} maxLength={80} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address_line" className={etiquette}>Adresse</label>
                  <input id="address_line" value={profil.address_line} onChange={(e) => maj("address_line", e.target.value)} className={champ} maxLength={200} placeholder="Rue, porte, repère" />
                  <p className="mt-1 text-xs text-gray-500">Laissez vide si vous ne recevez pas de public à cette adresse.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow md:p-6">
              <h2 className="text-xl font-black">Contact</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="public_phone" className={etiquette}>Téléphone public</label>
                  <input id="public_phone" type="tel" value={profil.public_phone} onChange={(e) => maj("public_phone", e.target.value)} className={champ} maxLength={30} placeholder="+223 …" />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={profil.show_phone} onChange={(e) => maj("show_phone", e.target.checked)} className="h-4 w-4" />
                    Afficher le téléphone
                  </label>
                </div>
                <div>
                  <label htmlFor="public_email" className={etiquette}>Email public</label>
                  <input id="public_email" type="email" value={profil.public_email} onChange={(e) => maj("public_email", e.target.value)} className={champ} maxLength={180} />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={profil.show_email} onChange={(e) => maj("show_email", e.target.checked)} className="h-4 w-4" />
                    Afficher l&apos;email
                  </label>
                </div>
                <div>
                  <label htmlFor="website" className={etiquette}>Site web</label>
                  <input id="website" type="url" value={profil.website} onChange={(e) => maj("website", e.target.value)} className={champ} placeholder="https://" />
                </div>
                <div>
                  <label htmlFor="opening_hours" className={etiquette}>Horaires</label>
                  <input id="opening_hours" value={profil.opening_hours} onChange={(e) => maj("opening_hours", e.target.value)} className={champ} maxLength={300} placeholder="Lun–Sam 8h–19h" />
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow md:p-6">
              <h2 className="text-xl font-black">Réseaux sociaux</h2>
              <p className="mt-1 text-sm text-gray-600">
                Liens vers vos pages officielles, en https. Chaque lien doit mener au réseau indiqué.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {donnees.networks.map((r) => (
                  <div key={r.key}>
                    <label htmlFor={`reseau-${r.key}`} className={etiquette}>{r.label}</label>
                    <input
                      id={`reseau-${r.key}`}
                      type="url"
                      value={profil.social_links[r.key] || ""}
                      onChange={(e) => maj("social_links", { ...profil.social_links, [r.key]: e.target.value })}
                      placeholder={`https://${r.domains[0]}/…`}
                      className={champ}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">Services</h2>
                <button
                  type="button"
                  onClick={() => maj("services", [...profil.services, { name: "", description: "" }])}
                  disabled={profil.services.length >= 20}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus size={16} aria-hidden="true" /> Ajouter
                </button>
              </div>
              {profil.services.length === 0 && <p className="mt-3 text-sm text-gray-500">Aucun service. Ajoutez ce que vous proposez (réparation, livraison, installation…).</p>}
              <ul className="mt-4 space-y-3">
                {profil.services.map((s, i) => (
                  <li key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      aria-label={`Nom du service ${i + 1}`}
                      value={s.name}
                      onChange={(e) => maj("services", profil.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      placeholder="Nom du service"
                      maxLength={80}
                      className={champ}
                    />
                    <input
                      aria-label={`Description du service ${i + 1}`}
                      value={s.description}
                      onChange={(e) => maj("services", profil.services.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      placeholder="Description (facultatif)"
                      maxLength={300}
                      className={champ}
                    />
                    <button
                      type="button"
                      onClick={() => maj("services", profil.services.filter((_, j) => j !== i))}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 p-3 text-red-700 hover:bg-red-50"
                      aria-label={`Retirer le service ${i + 1}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </fieldset>

          <div className="space-y-6">
            <fieldset disabled={!modifiable || envoi} className="space-y-4 rounded-2xl bg-white p-5 shadow md:p-6 lg:sticky lg:top-6">
              <h2 className="text-xl font-black">Publication</h2>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
                <input type="checkbox" checked={profil.is_public} onChange={(e) => maj("is_public", e.target.checked)} className="mt-1 h-5 w-5" />
                <span>
                  <span className="font-bold">Publier mon profil</span>
                  <span className="block text-sm text-gray-600">La page devient accessible à tous, sans connexion.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
                <input type="checkbox" checked={profil.listed_in_directory} onChange={(e) => maj("listed_in_directory", e.target.checked)} className="mt-1 h-5 w-5" />
                <span>
                  <span className="font-bold">Apparaître dans l&apos;annuaire</span>
                  <span className="block text-sm text-gray-600">Sinon, la page n&apos;est accessible que par son lien.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
                <input type="checkbox" checked={profil.show_products} onChange={(e) => maj("show_products", e.target.checked)} className="mt-1 h-5 w-5" />
                <span>
                  <span className="font-bold">Montrer mes produits publiés</span>
                  <span className="block text-sm text-gray-600">
                    {donnees.published_products} produit{donnees.published_products > 1 ? "s" : ""} publié{donnees.published_products > 1 ? "s" : ""} sur la marketplace.
                  </span>
                </span>
              </label>

              {profil.is_public && manquants.length > 0 && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  Pour publier, complétez : {manquants.join(", ")}.
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--ml-blue-deep,#0a1330)] py-3 font-black text-white disabled:opacity-60"
              >
                {envoi ? "Enregistrement…" : profil.is_public ? "Enregistrer et publier" : "Enregistrer sans publier"}
              </button>

              {lienPublic && (
                <a href={lienPublic} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-bold hover:bg-gray-50">
                  Voir ma page publique <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}

              <p className="text-xs text-gray-500">
                Votre page peut être indexée par les moteurs de recherche. MaliLink ne garantit pas son affichage
                dans Google : l&apos;indexation et le classement relèvent du moteur. Vous pouvez retirer le profil à
                tout moment en décochant « Publier ».
              </p>
            </fieldset>

            <section className="rounded-2xl bg-white p-5 shadow md:p-6" aria-labelledby="visibilite-google">
              <div className="flex items-start justify-between gap-3">
                <div><h2 id="visibilite-google" className="text-xl font-black">Visibilité Google</h2><p className="mt-1 text-sm text-gray-600">Préparez une fiche complète et cohérente avant de demander son indexation.</p></div>
                <span className={`rounded-full px-3 py-1 text-sm font-black ${scoreSeo >= 80 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{scoreSeo}%</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {criteresSeo.map((c) => <li key={c.label} className="flex items-center gap-2"><CheckCircle2 size={16} className={c.ok ? "text-green-600" : "text-gray-300"}/><span className={c.ok ? "font-semibold" : "text-gray-500"}>{c.label}</span></li>)}
              </ul>
              <div className="mt-5 grid gap-2">
                {lienPublic && <button type="button" onClick={()=>void copierLien()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-bold"><Copy size={16}/>Copier le lien de ma page</button>}
                <a href="https://business.google.com/add" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"><MapPin size={16}/>Créer ou revendiquer ma fiche Google</a>
                {lienPublic && <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(new URL(lienPublic, productConfig.siteUrl).toString())}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-bold"><SearchCheck size={16}/>Tester ma page Google</a>}
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">Google décide seul du moment et de la position d’affichage. Une fiche Google Business vérifiée, des coordonnées cohérentes et une page MaliLink complète améliorent la compréhension de l’entreprise sans garantir un classement.</p>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow md:p-6" aria-label="Aperçu de la fiche annuaire">
              <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">Aperçu de la fiche</h2>
              <div className="mt-3 rounded-xl border border-gray-200 p-4">
                <p className="font-black">{profil.company_name}</p>
                <p className="text-xs font-bold uppercase text-gray-500">{profil.activity.label}</p>
                {profil.description && <p className="mt-2 line-clamp-3 text-sm text-gray-700">{profil.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                  {profil.city && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" />{[profil.quartier, profil.city].filter(Boolean).join(", ")}</span>}
                  {profil.show_phone && profil.public_phone && <span className="inline-flex items-center gap-1"><Phone size={14} aria-hidden="true" />{profil.public_phone}</span>}
                  {profil.website && <span className="inline-flex items-center gap-1"><Globe size={14} aria-hidden="true" />Site web</span>}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">L&apos;email n&apos;apparaît que sur la page, et seulement si « Afficher l&apos;email » est coché.</p>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
