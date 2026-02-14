import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sheepdog Society",
    short_name: "Sheepdog",
    description: "Men of Faith Community",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#3B82F6",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
