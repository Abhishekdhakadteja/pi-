import type { MetadataRoute } from "next";

/** Lets the app be added to an Android home screen as "Clinic Easy". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clinic Easy",
    short_name: "Clinic Easy",
    description: "Simple clinic management for small clinics",
    start_url: "/",
    display: "standalone",
    background_color: "#050b1a",
    theme_color: "#050b1a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
