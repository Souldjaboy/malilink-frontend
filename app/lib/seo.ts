import type { Metadata } from "next";
import { productConfig } from "./product-config";

export const siteUrl = productConfig.siteUrl;

export const seoBusiness = {
  appName: productConfig.name,
  companyName:
    productConfig.product === "malilink"
      ? "MaliLink Global"
      : productConfig.product === "hafiya"
        ? "HAFIYA Laboratoire"
        : "Triangle Logistics Transport & Intérim SARL",
  country: "Mali",
  city: "Bamako",
  district: "ACI",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "",
  logo: `${siteUrl}${productConfig.logoUrl}`,
};

export const seoKeywords = [
  "logiciel gestion stock Mali",
  "logiciel caisse Mali",
  "WMS Mali",
  "gestion entrepôt Bamako",
  "logiciel pharmacie Mali",
  "logiciel restaurant Mali",
  "logiciel hôtel Mali",
  "logiciel quincaillerie Mali",
  "marketplace entreprise Mali",
  "POS Afrique",
  "gestion logistique Afrique",
  "gestion stock Afrique",
  "Triangle WMS Pro",
  "MaliLink Global",
  "HAFIYA Laboratoire",
];

export const defaultSeoDescription =
  productConfig.product === "malilink"
    ? "MaliLink Global est la plateforme tout-en-un conçue pour les entreprises africaines : marketplace, gestion, pharmacie, éducation, comptabilité, services et visibilité en ligne."
    : productConfig.product === "hafiya"
      ? "HAFIYA Laboratoire est une plateforme médicale pour gérer analyses, rendez-vous, patients, résultats et documents de laboratoire."
      : "Triangle WMS Pro est une plateforme française pour gérer stocks, entrepôts, caisse POS, comptabilité, documents et opérations internes Triangle Logistics.";

export function absoluteUrl(path = "/") {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * L'indexation n'est ouverte que pour MaliLink. Triangle et Hafiya sont des
 * applications de gestion : leur contenu n'a rien à faire dans un moteur, et
 * `publicIndexing` vaut false pour eux depuis l'origine. Tout ce qui suit est
 * conditionné à ce drapeau — c'est la garantie que le SEO MaliLink ne déborde
 * pas sur les deux autres produits.
 */
export const seoActif = productConfig.publicIndexing === true;

/**
 * Informations officielles de l'éditeur, publiées en données structurées.
 *
 * Elles viennent de l'environnement et non du code : renseigner une adresse ou
 * des horaires est une décision métier, pas une valeur à deviner. Ce qui n'est
 * pas fourni est simplement absent du JSON-LD — jamais inventé, jamais
 * approximé. `informationsManquantes()` dit ce qu'il reste à fournir.
 */
export const organisation = {
  nom: seoBusiness.companyName,
  telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "",
  adresse: process.env.NEXT_PUBLIC_ORG_ADDRESS || "",
  ville: process.env.NEXT_PUBLIC_ORG_CITY || "",
  quartier: process.env.NEXT_PUBLIC_ORG_DISTRICT || "",
  region: process.env.NEXT_PUBLIC_ORG_REGION || "",
  pays: process.env.NEXT_PUBLIC_ORG_COUNTRY || "",
  latitude: process.env.NEXT_PUBLIC_ORG_LAT || "",
  longitude: process.env.NEXT_PUBLIC_ORG_LNG || "",
  horaires: process.env.NEXT_PUBLIC_ORG_HOURS || "",
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
  tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || "",
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || "",
};

/** Ce qu'il reste à renseigner pour que le référencement local soit complet. */
export function informationsManquantes() {
  const attendu: Array<[keyof typeof organisation, string]> = [
    ["adresse", "NEXT_PUBLIC_ORG_ADDRESS"],
    ["ville", "NEXT_PUBLIC_ORG_CITY"],
    ["quartier", "NEXT_PUBLIC_ORG_DISTRICT"],
    ["region", "NEXT_PUBLIC_ORG_REGION"],
    ["pays", "NEXT_PUBLIC_ORG_COUNTRY"],
    ["horaires", "NEXT_PUBLIC_ORG_HOURS"],
    ["latitude", "NEXT_PUBLIC_ORG_LAT"],
    ["longitude", "NEXT_PUBLIC_ORG_LNG"],
    ["facebook", "NEXT_PUBLIC_SOCIAL_FACEBOOK"],
    ["instagram", "NEXT_PUBLIC_SOCIAL_INSTAGRAM"],
    ["tiktok", "NEXT_PUBLIC_SOCIAL_TIKTOK"],
  ];
  return attendu.filter(([cle]) => !organisation[cle]).map(([, variable]) => variable);
}

/** Réseaux officiels réellement renseignés — `sameAs` de Schema.org. */
export function reseauxOfficiels() {
  return [organisation.facebook, organisation.instagram, organisation.tiktok, organisation.linkedin]
    .filter(Boolean);
}

export function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== "" && entry !== undefined && entry !== null)
  ) as Partial<T>;
}

/* ------------------------------------------------------------------ *
 * METADATA
 * ------------------------------------------------------------------ */

/** Coupe une description à la longueur utile d'un extrait de résultat. */
export function extrait(texte: string, longueur = 155) {
  const propre = String(texte || "").replace(/\s+/g, " ").trim();
  if (propre.length <= longueur) return propre;
  const coupe = propre.slice(0, longueur);
  return `${coupe.slice(0, coupe.lastIndexOf(" ") || longueur)}…`;
}

type OptionsPage = {
  titre: string;
  description: string;
  chemin: string;
  images?: string[];
  /** Une page qui ne doit pas être indexée bien qu'accessible (panier, etc.). */
  noindex?: boolean;
  type?: "website" | "article";
};

/**
 * Metadata d'une page publique MaliLink : canonical, Open Graph et Twitter
 * card cohérents, calculés une seule fois.
 *
 * Hors MaliLink, renvoie `noindex` : aucune page de Triangle ou Hafiya ne peut
 * devenir indexable par ce chemin.
 */
export function metadataPage({
  titre, description, chemin, images = [], noindex = false, type = "website",
}: OptionsPage): Metadata {
  const url = absoluteUrl(chemin);
  const description_ = extrait(description || defaultSeoDescription);
  const visuels = (images.length ? images : [productConfig.logoUrl])
    .map((src) => (src.startsWith("http") ? src : absoluteUrl(src)));

  const indexable = seoActif && !noindex;

  return {
    title: titre,
    description: description_,
    alternates: { canonical: url },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false },
    openGraph: {
      type,
      url,
      siteName: productConfig.name,
      title: titre,
      description: description_,
      locale: "fr_FR",
      images: visuels.map((src) => ({ url: src })),
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description: description_,
      images: visuels,
    },
  };
}

/* ------------------------------------------------------------------ *
 * DONNÉES STRUCTURÉES
 * ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

/** Retire récursivement ce qui est vide : un JSON-LD ne déclare que du réel. */
export function nettoyerJsonLd<T>(valeur: T): T {
  if (Array.isArray(valeur)) {
    const liste = valeur.map(nettoyerJsonLd).filter((x) => x !== undefined);
    return (liste.length ? liste : undefined) as T;
  }
  if (valeur && typeof valeur === "object") {
    const entrees = Object.entries(valeur as Json)
      .map(([cle, v]) => [cle, nettoyerJsonLd(v)] as const)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null);
    return (entrees.length ? Object.fromEntries(entrees) : undefined) as T;
  }
  return (valeur === "" || valeur === null ? undefined : valeur) as T;
}

/** L'éditeur du site, avec ses seules coordonnées réellement renseignées. */
export function organisationJsonLd() {
  return nettoyerJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organisation.nom,
    url: siteUrl,
    logo: absoluteUrl(productConfig.logoUrl),
    email: organisation.email || undefined,
    telephone: organisation.telephone || undefined,
    sameAs: reseauxOfficiels(),
    address: nettoyerJsonLd({
      "@type": "PostalAddress",
      streetAddress: organisation.adresse || undefined,
      addressLocality: organisation.ville || undefined,
      addressRegion: organisation.region || undefined,
      addressCountry: organisation.pays || undefined,
    }),
  });
}

export type ProduitPublic = {
  id: number; title: string; description?: string; reference?: string;
  price: number; currency: string; availability: string; category?: string;
  images?: string[]; url: string;
  vendor?: { name?: string; city?: string; quartier?: string; slug?: string };
};

/** Product + Offer. Le prix et la disponibilité viennent du DTO public. */
export function produitJsonLd(p: ProduitPublic) {
  return nettoyerJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description || undefined,
    sku: p.reference || undefined,
    image: (p.images || []).map((src) => (src.startsWith("http") ? src : absoluteUrl(src))),
    category: p.category || undefined,
    brand: p.vendor?.name ? { "@type": "Brand", name: p.vendor.name } : undefined,
    offers: nettoyerJsonLd({
      "@type": "Offer",
      url: absoluteUrl(p.url),
      price: p.price > 0 ? String(p.price) : undefined,
      priceCurrency: p.currency || "XOF",
      availability: `https://schema.org/${p.availability === "InStock" ? "InStock" : "OutOfStock"}`,
      seller: p.vendor?.name ? { "@type": "Organization", name: p.vendor.name } : undefined,
    }),
  });
}

/** Fil d'Ariane : aide le moteur à comprendre la place de la page. */
export function filAriane(etapes: Array<{ nom: string; chemin: string }>) {
  return nettoyerJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: etapes.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: absoluteUrl(e.chemin),
    })),
  });
}

export type EntreprisePublique = {
  company_id: number; slug: string; name: string; description?: string;
  logo_url?: string; website?: string; phone?: string; email?: string;
  country?: string; region?: string; city?: string; quartier?: string;
  address_line?: string; latitude?: number | null; longitude?: number | null;
  opening_hours?: unknown; url: string;
  social_links?: Record<string, string | undefined>;
  services?: Array<{ name: string; description?: string }>;
  activity?: { key: string; label: string };
};

/* Type Schema.org selon l'activité réelle de l'entreprise. Un type plus
   précis n'est employé que s'il décrit bien le métier ; sinon LocalBusiness. */
const TYPES_LOCAUX: Record<string, string> = {
  commerce: "Store",
  b2b: "Store",
  restaurant: "Restaurant",
  ecole: "EducationalOrganization",
  laboratoire: "MedicalBusiness",
  pharmacie: "Pharmacy",
  sante: "MedicalBusiness",
  immobilier: "RealEstateAgent",
  automobile: "AutomotiveBusiness",
};

/** Site MaliLink et recherche publique. Le moteur de recherche reste libre
 * d'utiliser ou non cette information ; elle ne promet aucun classement. */
export function siteWebJsonLd() {
  return nettoyerJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#site`,
    name: productConfig.name,
    alternateName: ["MaliLink", "MaliLink Global Afrique"],
    url: siteUrl,
    inLanguage: ["fr", "en", "ar", "zh-CN"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/entreprises")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });
}

/* Schema.org n'accepte pour `openingHours` que la forme « Mo-Sa 08:00-19:00 ».
   Un texte libre (« Lun–Sam 8h–19h ») s'affiche sur la page mais n'est pas
   déclaré : une donnée structurée mal formée vaut moins que rien. */
const HORAIRES_SCHEMA = /^(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?(,(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?)* \d{2}:\d{2}-\d{2}:\d{2}$/;

function logoAbsolu(src?: string) {
  if (!src) return undefined;
  return src.startsWith("http") ? src : absoluteUrl(src);
}

/**
 * Type local (Store, Restaurant…) dès qu'une localisation réelle existe,
 * Organization sinon. Annoncer un commerce local sans adresse serait une
 * donnée fausse.
 */
export function entrepriseJsonLd(e: EntreprisePublique) {
  const localise = Boolean(e.city || e.address_line || (e.latitude && e.longitude));
  const type = localise ? TYPES_LOCAUX[e.activity?.key || ""] || "LocalBusiness" : "Organization";
  const reseaux = Object.values(e.social_links || {}).filter((x): x is string => Boolean(x));
  const horaires = typeof e.opening_hours === "string" ? e.opening_hours.trim() : "";
  return nettoyerJsonLd({
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${absoluteUrl(e.url)}#entreprise`,
    name: e.name,
    description: e.description || undefined,
    url: absoluteUrl(e.url),
    logo: logoAbsolu(e.logo_url),
    image: logoAbsolu(e.logo_url),
    telephone: e.phone || undefined,
    email: e.email || undefined,
    sameAs: [e.website, ...reseaux].filter(Boolean),
    makesOffer: (e.services || []).map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name, description: s.description || undefined },
    })),
    address: nettoyerJsonLd({
      "@type": "PostalAddress",
      streetAddress: [e.address_line, e.quartier].filter(Boolean).join(", ") || undefined,
      addressLocality: e.city || undefined,
      addressRegion: e.region || undefined,
      addressCountry: e.country || undefined,
    }),
    geo: e.latitude && e.longitude
      ? { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude }
      : undefined,
    openingHours: HORAIRES_SCHEMA.test(horaires) ? horaires : undefined,
  });
}

/** Liste des fiches d'une page de l'annuaire : ItemList de liens. */
export function annuaireJsonLd(fiches: Array<{ name: string; url: string }>, debut = 0) {
  return nettoyerJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: fiches.map((f, i) => ({
      "@type": "ListItem",
      position: debut + i + 1,
      name: f.name,
      url: absoluteUrl(f.url),
    })),
  });
}
