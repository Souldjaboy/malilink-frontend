/**
 * LECTURE DES DONNÉES PUBLIQUES CÔTÉ SERVEUR.
 *
 * Les pages produit et entreprise sont rendues sur le serveur : leur contenu
 * doit exister dans le HTML, sans quoi ni les moteurs ni les aperçus de
 * partage des réseaux sociaux ne voient autre chose qu'une page vide.
 *
 * Le proxy `/api/*` de next.config n'existe que pour le navigateur ; depuis le
 * serveur on s'adresse donc directement au backend. Aucun jeton n'est envoyé :
 * ces routes sont publiques par construction, et le backend n'y répond que par
 * des champs autorisés.
 */

const BACKEND = process.env.BACKEND_URL || "http://localhost:5050";

/* Une page publique ne doit jamais échouer à cause du backend : en cas
   d'indisponibilité on rend ce qu'on peut plutôt qu'une erreur 500, qui serait
   interprétée par le moteur comme une page morte.

   `revalidate = 0` : lecture sans cache. Next ne met en cache que les
   réponses 200 : quand une fiche est retirée (404), l'ancienne réponse 200
   n'est jamais remplacée et resterait servie indéfiniment. Les fiches d'une
   entreprise ou d'un produit sont donc lues à chaque rendu ; les listes, qui
   répondent toujours 200, peuvent être mises en cache. */
async function lire<T>(chemin: string, revalidate = 300): Promise<T | null> {
  try {
    const r = await fetch(`${BACKEND}${chemin}`, {
      ...(revalidate === 0 ? { cache: "no-store" as const } : { next: { revalidate } }),
      headers: { accept: "application/json" },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type ProduitPublicDTO = {
  id: number;
  slug: string;
  url: string;
  title: string;
  description: string;
  reference: string;
  price: number;
  currency: string;
  availability: string;
  category: string;
  images: string[];
  image_url: string;
  vendor: { company_id: number | null; name: string; slug: string; city: string; quartier: string };
  created_at: string | null;
  updated_at: string | null;
};

export type EntreprisePubliqueDTO = {
  company_id: number;
  slug: string;
  name: string;
  description: string;
  logo_url: string;
  website: string;
  country: string;
  region: string;
  city: string;
  quartier: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string;
  phone: string;
  email: string;
  /** Liens https vérifiés vers les pages officielles de l'entreprise. */
  social_links: Partial<Record<ReseauPublic, string>>;
  services: Array<{ name: string; description: string }>;
  /** Type d'activité, issu du registre des profils métier du backend. */
  activity: { key: string; label: string };
  /** L'entreprise a choisi de montrer ses produits publiés sur sa page. */
  products_public: boolean;
  url: string;
  updated_at: string | null;
};

export type ReseauPublic =
  | "facebook" | "instagram" | "tiktok" | "whatsapp" | "linkedin"
  | "x" | "snapchat" | "youtube" | "google_business";

export const LIBELLES_RESEAUX: Record<ReseauPublic, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  x: "X",
  snapchat: "Snapchat",
  youtube: "YouTube",
  google_business: "Google Business Profile",
};

export type FicheAnnuaireDTO = {
  company_id: number;
  slug: string;
  name: string;
  description: string;
  logo_url: string;
  city: string;
  quartier: string;
  activity: { key: string; label: string };
  phone: string;
  services: string[];
  products_count: number;
  url: string;
  updated_at: string | null;
};

export type AnnuaireDTO = {
  companies: FicheAnnuaireDTO[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
  facets: {
    cities: Array<{ name: string; total: number }>;
    activities: Array<{ key: string; label: string; total: number }>;
  };
};

type EntreeSitemap = { path: string; lastmod: string | null };

/** Sans cache : un produit dépublié (404) doit disparaître dès le rendu suivant. */
export async function produitPublic(id: number) {
  const d = await lire<{ product: ProduitPublicDTO }>(`/public/products/${id}`, 0);
  return d?.product ?? null;
}

/* Annuaire : relu au plus toutes les 60 s. Un profil que l'entreprise
   retire doit en sortir vite ; 5 minutes, c'était 5 minutes de trop pour une
   donnée dont elle a révoqué la publication. */
const FRAICHEUR_ANNUAIRE = 60;

/** Sans cache : un profil retiré (404) doit disparaître dès le rendu suivant. */
export async function entreprisePublique(slugOuId: string) {
  const d = await lire<{ company: EntreprisePubliqueDTO; products: ProduitPublicDTO[] }>(
    `/public/companies/${encodeURIComponent(slugOuId)}`,
    0
  );
  return d ?? null;
}

/** Annuaire : uniquement les entreprises qui ont publié leur profil ET accepté d'y figurer. */
export async function annuairePublic(filtres: { q?: string; ville?: string; activite?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filtres.q) params.set("q", filtres.q);
  if (filtres.ville) params.set("ville", filtres.ville);
  if (filtres.activite) params.set("activite", filtres.activite);
  if (filtres.page && filtres.page > 1) params.set("page", String(filtres.page));
  const suite = params.toString();
  return lire<AnnuaireDTO>(`/public/companies${suite ? `?${suite}` : ""}`, FRAICHEUR_ANNUAIRE);
}

export async function sitemapPublic() {
  return lire<{
    products: EntreeSitemap[];
    companies: EntreeSitemap[];
    categories: EntreeSitemap[];
    totals: { products: number; companies: number; categories: number };
  }>("/public/sitemap", 900);
}

export async function categoriesPubliques() {
  const d = await lire<{ categories: Array<{ name: string; slug: string; total: number }> }>(
    "/public/categories",
    900
  );
  return d?.categories ?? [];
}
