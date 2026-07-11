import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acts 2028 Sheepdog Society",
    short_name: "Sheepdog",
    description:
      "A brotherhood of Christian men, anchored in Acts 20:28. We meet weekly around Scripture and stand watch over one another.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2EBDD", // bone — matches the light site
    theme_color: "#C8932A", // brass — the signature accent
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
