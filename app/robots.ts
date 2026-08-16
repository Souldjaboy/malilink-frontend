import type { MetadataRoute } from "next";
import { productConfig } from "./lib/product-config";
import { absoluteUrl, siteUrl } from "./lib/seo";

/**
 * Seul MaliLink est indexable. Pour Triangle et Hafiya, la réponse reste
 * `Disallow: /` — inchangée.
 *
 * Deux corrections par rapport à la version précédente :
 *
 *  - `/login`, `/register` et leurs variantes ne sont plus autorisées. Ce sont
 *    des formulaires, pas des pages d'atterrissage : indexées, elles diluent
 *    le budget de crawl et ressortent à la place des pages marchandes.
 *  - la liste blanche par chemin est abandonnée. Énumérer les pages permises
 *    condamne au silence toute page créée ensuite — c'est ce qui laissait
 *    `/produit/...` et `/partenaires/...` hors du crawl. On autorise donc la
 *    racine, et on interdit explicitement les espaces privés.
 */
export default function robots(): MetadataRoute.Robots {
  if (!productConfig.publicIndexing) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      host: siteUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          /* Espaces authentifiés */
          "/dashboard", "/super-admin", "/parametres", "/parametres-pointage",
          "/utilisateurs", "/comptabilite", "/rapports", "/documents",
          "/stocks", "/inventaires", "/entrepots", "/emplacements", "/produits",
          "/pos", "/badges", "/pointage", "/attendance-scan", "/scanner",
          "/notifications", "/alertes", "/activites", "/vendor", "/livreur",
          "/wallet", "/finance", "/import", "/chat", "/assistant", "/social",
          /* `/partenaires` est la fiche CRM d'un partenaire commercial —
             ventes, encaissements, impayés — et non une vitrine. La vitrine
             publique d'un vendeur, elle, est `/boutique/<slug>`. */
          "/partenaires",
          /* `/recherche` interroge les données internes de l'entreprise
             connectée. La recherche publique est celle du marketplace. */
          "/recherche",
          /* Tunnel d'achat et espace client : utiles, mais sans valeur en
             résultat de recherche et propres à chaque visiteur. */
          "/marketplace/cart", "/marketplace/checkout", "/marketplace/orders",
          "/client/dashboard", "/client/orders", "/client/profile",
          /* Formulaires d'authentification */
          "/login", "/register", "/client/login", "/client/register",
          "/mot-de-passe-oublie", "/verify-email", "/verify-phone",
          "/verification-required", "/abonnement-expire",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
