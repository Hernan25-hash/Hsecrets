import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "XSecrets — Discover Your Secret Side",
    short_name: "XSecrets",
    description: "A private, immersive space for curated adult entertainment.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#09090b",
    background_color: "#09090b",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
