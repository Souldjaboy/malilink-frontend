import type { Metadata } from "next";
import "./globals.css";
import { appProduct } from "./lib/product-config";
import MaliLinkHomeButton from "./components/MaliLinkHomeButton";

export const metadata: Metadata = {
  title: "MaliLink Global",
  description: "Marketplace, IA, SaaS et services numériques.",
  icons: {
    icon: "/icons/malilink/icon-192.png",
    shortcut: "/icons/malilink/icon-192.png",
    apple: "/icons/malilink/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

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
