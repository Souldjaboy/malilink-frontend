import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MaliLink Global",
    short_name: "MaliLink",
    description:
      "La super-plateforme africaine : marketplace, livraison, école, restaurant, gestion et assistant IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1b3d",
    theme_color: "#0f1b3d",
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
