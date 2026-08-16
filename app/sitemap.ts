import type { MetadataRoute } from "next";
import { productConfig } from "./lib/product-config";
import { absoluteUrl } from "./lib/seo";
import { sitemapPublic } from "./lib/public-api";

/**
 * Sitemap MaliLink, construit à partir du catalogue réel.
 *
 * Triangle et Hafiya renvoient un sitemap vide, comme auparavant.
 *
 * `lastmod` n'est émis que lorsqu'une vraie date de modification existe :
 * horodater toutes les URL au jour de la génération apprend au moteur que la
 * date ne veut rien dire, et il cesse d'en tenir compte.
 *
 * Les formulaires d'authentification ont été retirés : ce ne sont pas des
 * pages d'atterrissage.
 */
const pagesFixes = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/marketplace", priority: 0.95, changeFrequency: "daily" as const },
  { path: "/solutions", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/services", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/a-propos", priority: 0.75, changeFrequency: "monthly" as const },
  { path: "/installer-application", priority: 0.6, changeFrequency: "monthly" as const },
];

/* Au-delà de ce volume, un fichier unique n'est plus la bonne forme : la
   limite du format est de 50 000 URL, et Google recommande de segmenter bien
   avant. `generateSitemaps` prendra le relais le jour où le catalogue le
   justifie ; le seuil est ici pour que ce jour-là soit visible dans les
   journaux plutôt que découvert par une erreur d'indexation. */
export const SEUIL_SEGMENTATION = 45000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!productConfig.publicIndexing) return [];

  const fixes: MetadataRoute.Sitemap = pagesFixes.map((r) => ({
    url: absoluteUrl(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const donnees = await sitemapPublic();
  if (!donnees) return fixes;

  const total =
    donnees.products.length + donnees.companies.length + donnees.categories.length;
  if (total > SEUIL_SEGMENTATION) {
    console.warn(
      `[sitemap] ${total} URL dépassent le seuil de ${SEUIL_SEGMENTATION} : passer à un sitemap index segmenté.`
    );
  }

  const entree = (
    chemin: string,
    lastmod: string | null,
    priority: number,
    changeFrequency: "daily" | "weekly" | "monthly"
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(chemin),
    ...(lastmod ? { lastModified: new Date(lastmod) } : {}),
    changeFrequency,
    priority,
  });

  return [
    ...fixes,
    ...donnees.categories.map((c) => entree(c.path, c.lastmod, 0.8, "weekly")),
    ...donnees.companies.map((c) => entree(c.path, c.lastmod, 0.8, "weekly")),
    ...donnees.products.map((p) => entree(p.path, p.lastmod, 0.7, "daily")),
  ];
}
