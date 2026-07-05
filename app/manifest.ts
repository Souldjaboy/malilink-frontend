import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MaliLink Global",
    short_name: "MaliLink",
    description: "Marketplace, IA, SaaS et services numériques.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#071b38",
    theme_color: "#071b38",
    icons: [
      {
        src: "/icons/malilink/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/malilink/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
