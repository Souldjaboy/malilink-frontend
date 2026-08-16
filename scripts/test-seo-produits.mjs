/**
 * NON-RÉGRESSION MULTI-PRODUITS — SUR LE VRAI RUNTIME.
 *
 * Ce dépôt sert MaliLink, Triangle WMS Pro et HAFIYA. Le chantier SEO ne
 * concerne que MaliLink ; ce test le prouve plutôt que de l'affirmer.
 *
 * Plutôt que d'importer les modules — ce qui testerait une reconstitution du
 * comportement — il démarre réellement l'application pour chaque produit et
 * interroge `/robots.txt`, `/sitemap.xml` et l'accueil en HTTP, comme le ferait
 * un moteur de recherche.
 *
 * Pour Triangle et Hafiya, la référence est le comportement d'avant le
 * chantier : tout le site interdit au crawl, sitemap vide, titre inchangé.
 *
 *   node scripts/test-seo-produits.mjs
 */

import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";

const PORT = 3099;
const BASE = `http://127.0.0.1:${PORT}`;

let reussis = 0;
let echoues = 0;

function verifier(nom, condition, detail = "") {
  if (condition) {
    reussis += 1;
    console.log(`  ✓ ${nom}`);
  } else {
    echoues += 1;
    console.log(`  ✗ ${nom}${detail ? ` — ${detail}` : ""}`);
  }
}

async function attendreDemarrage(limiteMs = 90000) {
  const fin = Date.now() + limiteMs;
  while (Date.now() < fin) {
    try {
      const r = await fetch(`${BASE}/robots.txt`);
      if (r.ok) return true;
    } catch { /* pas encore prêt */ }
    await pause(1000);
  }
  return false;
}

async function avecProduit(produit, verifications) {
  const serveur = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    env: { ...process.env, NEXT_PUBLIC_APP_PRODUCT: produit, PORT: String(PORT) },
    stdio: "ignore",
    detached: true,
  });
  try {
    if (!(await attendreDemarrage())) throw new Error(`${produit} : serveur non démarré`);
    await verifications();
  } finally {
    try { process.kill(-serveur.pid, "SIGKILL"); } catch { /* déjà arrêté */ }
    await pause(1500);
  }
}

const texte = async (chemin) => (await fetch(`${BASE}${chemin}`)).text();

for (const produit of ["triangle", "hafiya"]) {
  console.log(`\n${produit.toUpperCase()} — doit rester exactement comme avant le chantier`);
  await avecProduit(produit, async () => {
    const robots = await texte("/robots.txt");
    verifier("robots interdit tout le site", /Disallow:\s*\/\s*$/m.test(robots.trim()), robots.trim().slice(0, 120));
    verifier("robots n'annonce aucun sitemap", !/Sitemap:/i.test(robots));
    verifier("robots n'autorise rien", !/^Allow:/im.test(robots));

    const sitemap = await texte("/sitemap.xml");
    const urls = (sitemap.match(/<url>/g) || []).length;
    verifier("sitemap vide", urls === 0, `${urls} URL`);

    const accueil = await texte("/");
    const titre = (accueil.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
    verifier("titre inchangé", titre === "MaliLink Global", `« ${titre} »`);
    verifier("aucune balise canonical ajoutée", !/rel="canonical"/i.test(accueil));
    verifier("aucune donnée structurée ajoutée", !/application\/ld\+json/i.test(accueil));
    verifier("aucune carte Open Graph ajoutée", !/property="og:/i.test(accueil));
  });
}

console.log("\nMALILINK — le SEO doit être actif");
await avecProduit("malilink", async () => {
  const robots = await texte("/robots.txt");
  verifier("robots autorise la racine", /^Allow:\s*\/$/m.test(robots), robots.slice(0, 120));
  verifier("robots annonce le sitemap", /Sitemap:\s*\S+\/sitemap\.xml/i.test(robots));
  for (const chemin of ["/login", "/register", "/dashboard", "/parametres", "/partenaires", "/recherche"]) {
    verifier(`${chemin} interdit au crawl`, robots.includes(`Disallow: ${chemin}`));
  }
  verifier("le marketplace reste crawlable", !/^Disallow:\s*\/marketplace$/m.test(robots));

  const sitemap = await texte("/sitemap.xml");
  verifier("sitemap non vide", (sitemap.match(/<url>/g) || []).length > 0);
  verifier("accueil dans le sitemap", sitemap.includes("<loc>https://malilinkglobal.com/</loc>"));
  for (const prive of ["/login", "/register", "/dashboard"]) {
    verifier(`${prive} absent du sitemap`, !sitemap.includes(`${prive}<`));
  }

  const accueil = await texte("/");
  verifier("canonical présent", /rel="canonical"/i.test(accueil));
  verifier("Open Graph présent", /property="og:title"/i.test(accueil));
  verifier("Twitter card présente", /name="twitter:card"/i.test(accueil));
  verifier("titre enrichi", /<title[^>]*>MaliLink Global — /i.test(accueil));

  const introuvable = await fetch(`${BASE}/page-qui-nexiste-pas`);
  verifier("page inconnue : statut 404", introuvable.status === 404, `statut ${introuvable.status}`);
});

console.log(`\n${reussis} réussis, ${echoues} échoués\n`);
process.exit(echoues ? 1 : 0);
