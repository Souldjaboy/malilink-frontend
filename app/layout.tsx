import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
