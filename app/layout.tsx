import type { Metadata } from "next";
import "./globals.css";
import { appProduct, productConfig } from "./lib/product-config";
import { defaultSeoDescription, seoActif, siteUrl } from "./lib/seo";
import MaliLinkHomeButton from "./components/MaliLinkHomeButton";

/* Metadata commune à toutes les pages, appliquée uniquement à MaliLink.
   Triangle et Hafiya ne sont pas indexables : leur bloc reste identique au
   caractère près, pour qu'aucun de leurs onglets, aperçus de partage ou
   comportements de crawl ne change. */
const metadataCommune: Metadata = {
  icons: {
    icon: "/icons/malilink/icon-192.png",
    shortcut: "/icons/malilink/icon-192.png",
    apple: "/icons/malilink/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

const metadataMaliLink: Metadata = {
  /* metadataBase rend absolues les URL d'images et de canonical : sans lui,
     une image Open Graph relative n'est résolue par aucun réseau social. */
  metadataBase: new URL(siteUrl),
  title: {
    default: `${productConfig.name} — ${productConfig.slogan}`,
    /* Chaque page apporte son titre ; la marque est ajoutée ici une seule
       fois, ce qui évite les titres dupliqués sur tout le site. */
    template: `%s | ${productConfig.shortName}`,
  },
  description: defaultSeoDescription,
  applicationName: productConfig.name,
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: productConfig.name,
    title: productConfig.name,
    description: defaultSeoDescription,
    url: siteUrl,
    locale: "fr_FR",
    images: [{ url: productConfig.logoUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: productConfig.name,
    description: defaultSeoDescription,
    images: [productConfig.logoUrl],
  },
};

export const metadata: Metadata = seoActif
  ? { ...metadataCommune, ...metadataMaliLink }
  : { ...metadataCommune, title: "MaliLink Global", description: "Marketplace, IA, SaaS et services numériques." };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-product active le design system produit de globals.css
    // (html[data-product="..."]) — chaque build ne connaît que son produit.
    <html lang="fr" data-product={appProduct}>
      <body>
        {children}
        <MaliLinkHomeButton />
      </body>
    </html>
  );
}
