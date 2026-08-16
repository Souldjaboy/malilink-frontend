import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    /* WebP en priorité, AVIF pour les navigateurs qui le gèrent : les photos
       commerciales gardent leur qualité, seul le poids transféré baisse.
       Aucun `remotePatterns` n'est déclaré : le composant PhotoPublique
       n'optimise que les images servies par notre propre origine, et rend les
       URL externes avec une balise simple plutôt que de lever une erreur sur
       un hôte non déclaré. */
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:5050"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
