import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vérification d'un document scolaire",
  robots: { index: false, follow: false },
};

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
