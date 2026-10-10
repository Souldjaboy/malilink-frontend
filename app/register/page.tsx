"use client";

/**
 * Inscription MaliLink Global — offres commerciales et création de l'espace.
 *
 * Structure : présentation → nos offres (Starter / Business / Pro) →
 * formulaire entreprise → modules → résumé → « Créer mon espace ».
 *
 * Les offres viennent de /public/plans (prix, frais d'installation, arguments,
 * badge « recommandé » : tout est réglable par le super-admin). Les modules
 * viennent de useRegistrationModules, qui applique les mêmes règles que le
 * backend : type d'activité + offre + choix.
 *
 * Aucune offre de secours codée en dur : l'ancienne liste portait de faux
 * identifiants de plan et de faux prix. Si les offres ne se chargent pas, on
 * le dit et on n'envoie rien.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Boxes, Building2, Check, CheckCircle2, Crown, Headphones, Layers,
  Loader2, Lock, Rocket, ShieldCheck, ShoppingCart, Sparkles, Store, Users, Warehouse,
} from "lucide-react";
import { apiUrl } from "../lib/api";
import { formatFCFA } from "../lib/format";
import { useRegistrationModules, type ModuleCard } from "./useRegistrationModules";
import WhatsAppSupportButton from "../../components/WhatsAppSupportButton";
import SocialAuthButtons from "../../components/SocialAuthButtons";

type Offre = {
  id: number;
  name: string;
  display_name: string;
  commercial_code: string;
  price_monthly: number | string;
  installation_fee: number | string;
  is_recommended: boolean;
  highlights: string[];
  max_users: number;
  max_warehouses: number;
  max_products: number;
  trial_days: number;
  max_modules_allowed: number;
  excluded_modules: string[];
};

const TYPES_ACTIVITE = [
  ["commerce", "Commerce / Boutique"],
  ["restaurant", "Restaurant"],
  ["ecole", "École / Éducation"],
  ["laboratoire", "Laboratoire"],
  ["pharmacie", "Pharmacie"],
  ["immobilier", "Immobilier / Hôtel"],
  ["automobile", "Automobile / Garage"],
  ["logistique", "Livraison / Transport"],
  ["sante", "Santé / Clinique"],
  ["services", "Services"],
  ["b2b", "B2B / Grossiste"],
  ["autre", "Autre"],
] as const;

const ICONE_OFFRE: Record<string, typeof Rocket> = { starter: Rocket, business: Crown, pro: Sparkles };
const ICONE_GROUPE: Record<string, typeof Store> = {
  communication: Headphones, ventes: ShoppingCart, stock: Boxes, finance: BarChart3,
  administration: ShieldCheck, verticales: Building2, options: Layers,
};

/* 0 = sans limite. (Le seuil 999 ne vaut que pour les MODULES : 3 000
   produits, c'est bien 3 000.) */
const limite = (v: number | string | null | undefined, unite: string) => {
  const n = Number(v || 0);
  return n <= 0 ? `${unite} illimités` : `${n.toLocaleString("fr-FR")} ${unite}`;
};

export default function RegisterPage() {
  const router = useRouter();

  const [offres, setOffres] = useState<Offre[]>([]);
  const [offresEnErreur, setOffresEnErreur] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Offre | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    business_type: "",
    responsible_name: "",
    email: "",
    phone: "",
    country: "Mali",
    address: "",
    password: "",
  });

  const modules = useRegistrationModules(formData.business_type, selectedPlan);

  useEffect(() => {
    fetch(apiUrl("/public/plans"))
      .then(async (r) => (r.ok ? ((await r.json()) as Offre[]) : Promise.reject(new Error(String(r.status)))))
      .then((liste) => {
        const valides = Array.isArray(liste) ? liste : [];
        setOffres(valides);
        setOffresEnErreur(valides.length === 0);
        // L'offre recommandée est présélectionnée, sinon la première.
        setSelectedPlan((actuelle) => actuelle || valides.find((o) => o.is_recommended) || valides[0] || null);
      })
      .catch(() => setOffresEnErreur(true));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleModule = (moduleKey: string) => {
    const refus = modules.toggle(moduleKey);
    setError(refus || "");
  };

  const choisirOffre = (offre: Offre) => {
    setSelectedPlan(offre);
    setError("");
    document.getElementById("formulaire")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Cartes regroupées pour l'affichage.
  const groupes = useMemo(() => {
    const parGroupe = new Map<string, ModuleCard[]>();
    for (const carte of modules.cards) {
      if (!parGroupe.has(carte.group)) parGroupe.set(carte.group, []);
      parGroupe.get(carte.group)!.push(carte);
    }
    return [...parGroupe.entries()];
  }, [modules.cards]);

  const nbModules = modules.cards.filter((c) => c.selected).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan) {
      setError("Veuillez choisir une offre.");
      return;
    }
    if (!formData.business_type) {
      setError("Veuillez choisir votre type d'activité : il détermine vos modules.");
      return;
    }
    if (modules.limit !== null && modules.added.length > modules.limit) {
      setError(`L'offre ${selectedPlan.display_name} permet d'ajouter ${modules.limit} module(s) au-delà de votre activité.`);
      return;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setError("Veuillez saisir au moins un email ou un téléphone.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const registerResponse = await fetch(apiUrl("/register-saas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          plan_price: selectedPlan.price_monthly,
          selected_modules: modules.payload,
        }),
      });

      const registerText = await registerResponse.text();
      let registerData: Record<string, any> = {};
      try {
        registerData = registerText ? JSON.parse(registerText) : {};
      } catch {
        registerData = { error: `Réponse serveur invalide : ${registerText.slice(0, 160)}` };
      }

      if (!registerResponse.ok) {
        setError(registerData.error || "Erreur inscription.");
        return;
      }

      const verification = registerData.verification || {};

      // Inscription par téléphone seul : compte actif immédiatement.
      if (verification.required === false) {
        setMessage("Compte créé avec succès. Connectez-vous avec votre numéro de téléphone.");
        router.push("/login?created=phone");
        return;
      }

      const verifyPage = verification.target_type === "phone" ? "/verify-phone" : "/verify-email";
      const query = new URLSearchParams();
      if (verification.target_value) query.set("target", verification.target_value);
      if (registerData.user?.id) query.set("user_id", String(registerData.user.id));
      if (verification.delivery?.statut) query.set("envoi", String(verification.delivery.statut));

      setMessage(verification.delivery?.sent
        ? "Entreprise créée. Un code a été envoyé (accepté par le serveur d'envoi) : saisissez-le pour activer l'accès."
        : "Entreprise créée, mais l'email de vérification n'a pas pu être envoyé : demandez un nouveau code à l'étape suivante.");
      router.push(`${verifyPage}?${query.toString()}`);
    } catch (err) {
      console.error(err);
      setError("Erreur serveur.");
    } finally {
      setLoading(false);
    }
  };

  const champ =
    "w-full rounded-xl border border-[var(--ml-border,#e3e9f2)] bg-white px-4 py-3 text-[var(--ml-text,#10233f)] placeholder:text-slate-400 focus:border-[var(--ml-gold,#d4a23c)] focus:outline-none focus:ring-2 focus:ring-[var(--ml-gold,#d4a23c)]/30";

  return (
    <div className="min-h-screen bg-[var(--ml-soft,#f4f6fa)]">
      {/* ═══════════════ 1. PRÉSENTATION ═══════════════ */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "radial-gradient(900px 420px at 85% -10%, rgba(212,162,60,0.22), transparent 60%)," +
            "radial-gradient(700px 380px at -10% 110%, rgba(26,58,107,0.9), transparent 60%)," +
            "linear-gradient(160deg, #0a1330 0%, #0f1b3d 55%, #13254f 100%)",
        }}
      >
        {/* trame technologique discrète */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/brands/malilink-logo-officiel.jpg"
                alt="MaliLink Global"
                className="h-11 w-11 shrink-0 rounded-xl ring-2 ring-[var(--ml-gold,#d4a23c)]/70"
              />
              <span className="truncate text-lg font-black tracking-tight">MaliLink Global</span>
            </div>
            <a href="/login" className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold">
              Se connecter
            </a>
          </div>

          <div className="mt-10 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ml-gold-light,#e8c464)]">
              Solution SaaS professionnelle
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
              Gestion, ventes, stock et suivi d&apos;activité — dans un seul espace.
            </h1>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">
              Caisse, stock multi-sites, clients, rapports et équipe : MaliLink Global s&apos;adapte à votre
              activité dès la création de votre espace.
            </p>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              [ShieldCheck, "Accès par rôle et par droit"],
              [Warehouse, "Stock multi-sites"],
              [BarChart3, "Tableaux de bord en temps réel"],
              [Headphones, "Accompagnement au démarrage"],
            ].map(([Icone, texte]) => {
              const I = Icone as typeof Store;
              return (
                <li key={texte as string} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
                  <I className="h-5 w-5 shrink-0 text-[var(--ml-gold,#d4a23c)]" aria-hidden />
                  <span className="text-slate-200">{texte as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ═══════════════ 2. NOS OFFRES ═══════════════ */}
      <section className="relative mx-auto -mt-8 max-w-6xl px-4 sm:px-6" aria-labelledby="titre-offres">
        <div className="rounded-3xl bg-[var(--ml-blue,#0f1b3d)] p-5 shadow-2xl ring-1 ring-white/10 sm:p-8">
          <h2 id="titre-offres" className="text-2xl font-black text-white sm:text-3xl">Nos offres</h2>
          <p className="mt-1 text-sm text-slate-300">
            Les frais d&apos;installation se règlent une seule fois ; l&apos;abonnement est mensuel.
          </p>

          {offresEnErreur && (
            <div className="mt-6 rounded-xl bg-red-500/15 p-4 text-sm font-semibold text-red-100 ring-1 ring-red-400/30">
              Les offres sont momentanément indisponibles. Réessayez dans un instant ou contactez-nous.
            </div>
          )}

          {!offresEnErreur && offres.length === 0 && (
            <div className="mt-6 flex items-center gap-2 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement des offres…
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {offres.map((offre) => {
              const choisie = selectedPlan?.id === offre.id;
              const Icone = ICONE_OFFRE[offre.commercial_code] || Store;
              return (
                <article
                  key={offre.id}
                  className={`relative flex flex-col rounded-2xl p-5 transition ${
                    offre.is_recommended
                      ? "bg-gradient-to-b from-[#16264f] to-[#0f1b3d] ring-2 ring-[var(--ml-gold,#d4a23c)] md:-translate-y-2 md:shadow-[0_18px_40px_rgba(212,162,60,0.18)]"
                      : "bg-white/[0.04] ring-1 ring-white/15"
                  } ${choisie ? "outline outline-2 outline-offset-2 outline-white/70" : ""}`}
                >
                  {offre.is_recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--ml-gold,#d4a23c)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--ml-blue-deep,#0a1330)]">
                      Recommandé
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--ml-gold,#d4a23c)]/15 ring-1 ring-[var(--ml-gold,#d4a23c)]/40">
                      <Icone className="h-6 w-6 text-[var(--ml-gold-light,#e8c464)]" aria-hidden />
                    </span>
                    <h3 className="text-xl font-black uppercase tracking-wide text-white">{offre.display_name}</h3>
                  </div>

                  <dl className="mt-5 space-y-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Installation</dt>
                      <dd className="text-lg font-bold text-white">{formatFCFA(offre.installation_fee)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Abonnement</dt>
                      <dd className="text-3xl font-black text-[var(--ml-gold-light,#e8c464)] md:text-2xl lg:text-3xl">
                        <span className="whitespace-nowrap">{formatFCFA(offre.price_monthly)}</span>
                        <span className="text-sm font-semibold text-slate-300"> / mois</span>
                      </dd>
                    </div>
                  </dl>

                  <ul className="mt-5 space-y-2 text-sm text-slate-200">
                    {(offre.highlights || []).map((arg) => (
                      <li key={arg} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ml-gold,#d4a23c)]" aria-hidden />
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 grid grid-cols-1 gap-1 border-t border-white/10 pt-4 text-xs text-slate-400">
                    <span>{limite(offre.max_users, "utilisateurs")}</span>
                    <span>{limite(offre.max_warehouses, "sites de stock")}</span>
                    <span>{limite(offre.max_products, "produits")}</span>
                    {offre.trial_days > 0 && <span>{offre.trial_days} jours d&apos;essai</span>}
                  </div>

                  <button
                    type="button"
                    onClick={() => choisirOffre(offre)}
                    aria-pressed={choisie}
                    className={`mt-5 min-h-11 rounded-xl px-4 py-3 font-black ${
                      choisie ? "bg-white text-[var(--ml-blue,#0f1b3d)]" : "bg-yellow-500"
                    }`}
                  >
                    {choisie ? (
                      <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5" aria-hidden /> Offre choisie</span>
                    ) : (
                      `Choisir ${offre.display_name}`
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ 3–5. FORMULAIRE, MODULES, RÉSUMÉ ═══════════════ */}
      <form onSubmit={handleSubmit} id="formulaire" className="mx-auto grid max-w-6xl scroll-mt-4 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 3. Entreprise */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[var(--ml-border,#e3e9f2)] sm:p-8" aria-labelledby="titre-entreprise">
            <h2 id="titre-entreprise" className="text-2xl font-black">Votre entreprise</h2>
            <p className="mt-1 text-sm text-[var(--ml-text-soft,#516479)]">
              Le type d&apos;activité sélectionne les modules utiles à votre métier.
            </p>

            <div className="mt-5">
              <SocialAuthButtons mode="register" />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold">Nom de l&apos;entreprise *</span>
                <input name="company_name" required value={formData.company_name} onChange={handleChange} className={champ} autoComplete="organization" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Type d&apos;activité *</span>
                <select name="business_type" required value={formData.business_type} onChange={handleChange} className={champ}>
                  <option value="">Choisir…</option>
                  {TYPES_ACTIVITE.map(([valeur, libelle]) => (
                    <option key={valeur} value={valeur}>{libelle}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Responsable *</span>
                <input name="responsible_name" required value={formData.responsible_name} onChange={handleChange} className={champ} autoComplete="name" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Téléphone</span>
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className={champ} autoComplete="tel" placeholder="70 00 00 00" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Email</span>
                <input name="email" type="email" value={formData.email} onChange={handleChange} className={champ} autoComplete="email" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Pays</span>
                <input name="country" value={formData.country} onChange={handleChange} className={champ} autoComplete="country-name" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Adresse</span>
                <input name="address" value={formData.address} onChange={handleChange} className={champ} autoComplete="street-address" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold">Mot de passe *</span>
                <input name="password" type="password" required minLength={8} value={formData.password} onChange={handleChange} className={champ} autoComplete="new-password" />
                <span className="mt-1 block text-xs text-[var(--ml-text-soft,#516479)]">8 caractères minimum, avec au moins une lettre et un chiffre.</span>
              </label>
            </div>
            <p className="mt-3 text-xs text-[var(--ml-text-soft,#516479)]">Email ou téléphone : au moins l&apos;un des deux.</p>
          </section>

          {/* 4. Modules */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[var(--ml-border,#e3e9f2)] sm:p-8" aria-labelledby="titre-modules">
            <h2 id="titre-modules" className="text-2xl font-black">Modules de votre espace</h2>
            <p className="mt-1 text-sm text-[var(--ml-text-soft,#516479)]">
              {!formData.business_type
                ? "Choisissez d'abord votre type d'activité : les modules utiles seront sélectionnés pour vous."
                : `Sélection « ${modules.profileLabel} ». Décochez ce dont vous n'avez pas besoin.`}
            </p>

            {formData.business_type && (
              <>
                <p className="mt-3 inline-flex rounded-full bg-[var(--ml-soft,#f4f6fa)] px-3 py-1 text-xs font-bold">
                  Modules ajoutés au-delà de votre activité : {modules.added.length}
                  {modules.limit === null ? " (sans limite)" : ` / ${modules.limit}`}
                </p>
                <div className="mt-5 space-y-6">
                  {groupes.map(([groupe, cartes]) => {
                    const I = ICONE_GROUPE[groupe] || Layers;
                    return (
                      <div key={groupe}>
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                          <I className="h-4 w-4 text-[var(--ml-gold-deep,#b3862e)]" aria-hidden />
                          {modules.groups[groupe] || groupe}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                          {cartes.map((c) => (
                            <label
                              key={c.key}
                              className={`flex min-h-12 items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-semibold transition sm:gap-3 sm:px-3 ${
                                c.excludedByPlan
                                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                  : c.selected
                                    ? "cursor-pointer border-[var(--ml-gold,#d4a23c)] bg-[#fdf7e8]"
                                    : "cursor-pointer border-slate-200 bg-white text-slate-500"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 accent-[var(--ml-gold-deep,#b3862e)]"
                                checked={c.selected}
                                disabled={c.excludedByPlan}
                                onChange={() => toggleModule(c.key)}
                              />
                              <span className="min-w-0">
                                <span className="block">{c.label}</span>
                                {c.excludedByPlan && (
                                  <span className="flex items-center gap-1 text-xs font-normal">
                                    <Lock className="h-3 w-3" aria-hidden /> Inclus à partir de Business
                                  </span>
                                )}
                                {!c.excludedByPlan && !c.inProfile && (
                                  <span className="block text-xs font-normal text-slate-500">Module supplémentaire</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {/* 5. Résumé */}
        <aside className="lg:sticky lg:top-6 lg:self-start" aria-labelledby="titre-resume">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[var(--ml-border,#e3e9f2)]">
            <div className="bg-[var(--ml-blue,#0f1b3d)] px-5 py-4 text-white">
              <h2 id="titre-resume" className="text-lg font-black text-white">Résumé</h2>
            </div>
            <dl className="divide-y divide-[var(--ml-border,#e3e9f2)] px-5 text-sm">
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[var(--ml-text-soft,#516479)]">Offre</dt>
                <dd className="font-black">{selectedPlan?.display_name || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[var(--ml-text-soft,#516479)]">Frais d&apos;installation <span className="block text-xs">une seule fois</span></dt>
                <dd className="font-bold">{selectedPlan ? formatFCFA(selectedPlan.installation_fee) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[var(--ml-text-soft,#516479)]">Abonnement</dt>
                <dd className="font-bold">{selectedPlan ? `${formatFCFA(selectedPlan.price_monthly)} / mois` : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[var(--ml-text-soft,#516479)]">Modules</dt>
                <dd className="font-bold">{formData.business_type ? nbModules : "—"}</dd>
              </div>
              <div className="py-3">
                <dt className="text-[var(--ml-text-soft,#516479)]">Limites</dt>
                <dd className="mt-1 space-y-0.5">
                  {selectedPlan ? (
                    <>
                      <span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" aria-hidden />{limite(selectedPlan.max_users, "utilisateurs")}</span>
                      <span className="flex items-center gap-2"><Warehouse className="h-4 w-4 text-slate-400" aria-hidden />{limite(selectedPlan.max_warehouses, "sites de stock")}</span>
                      <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-slate-400" aria-hidden />{limite(selectedPlan.max_products, "produits")}</span>
                    </>
                  ) : "—"}
                </dd>
              </div>
            </dl>

            <div className="space-y-3 p-5">
              {message && <div className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</div>}
              {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}
              <button
                type="submit"
                disabled={loading || !selectedPlan || offresEnErreur}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-base font-black"
              >
                {loading ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Création…</> : "Créer mon espace"}
              </button>
              <p className="text-center text-xs text-[var(--ml-text-soft,#516479)]">
                Déjà un compte ? <a href="/login?from=register" className="font-bold underline">Se connecter</a>
              </p>
            </div>
          </div>
        </aside>
      </form>

      <WhatsAppSupportButton />
    </div>
  );
}
