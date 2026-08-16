import Link from "next/link";
import { productConfig } from "./lib/product-config";

/**
 * Page 404.
 *
 * Elle renvoie bien un statut 404 — Next s'en charge — ce qui compte autant
 * que son apparence : une page d'erreur répondant 200 fait indexer par le
 * moteur autant d'URL mortes qu'il en essaie.
 *
 * Les raccourcis proposés ne mènent qu'à des pages réellement ouvertes au
 * public ; sur Triangle et Hafiya, où le marketplace n'existe pas, seul le
 * retour à l'accueil est offert.
 */
export const metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

export default function Introuvable() {
  const marketplace = productConfig.marketplaceEnabled;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 p-8 text-center text-black">
      <p className="text-6xl font-black text-gray-300">404</p>
      <h1 className="text-3xl font-black">Cette page n’existe pas</h1>
      <p className="max-w-md text-gray-600">
        Le lien est peut-être obsolète, ou la page a été retirée.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-xl bg-black px-6 py-3 font-black text-white">
          Retour à l’accueil
        </Link>
        {marketplace && (
          <Link href="/marketplace" className="rounded-xl bg-white px-6 py-3 font-black shadow">
            Voir le marketplace
          </Link>
        )}
      </div>
    </main>
  );
}
