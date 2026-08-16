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
   interprétée par le moteur comme une page morte. */
async function lire<T>(chemin: string, revalidate = 300): Promise<T | null> {
  try {
    const r = await fetch(`${BACKEND}${chemin}`, {
      next: { revalidate },
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
  opening_hours: unknown;
  phone: string;
  email: string;
  url: string;
  updated_at: string | null;
};

type EntreeSitemap = { path: string; lastmod: string | null };

export async function produitPublic(id: number) {
  const d = await lire<{ product: ProduitPublicDTO }>(`/public/products/${id}`);
  return d?.product ?? null;
}

export async function entreprisePublique(slugOuId: string) {
  const d = await lire<{ company: EntreprisePubliqueDTO; products: ProduitPublicDTO[] }>(
    `/public/companies/${encodeURIComponent(slugOuId)}`
  );
  return d ?? null;
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
