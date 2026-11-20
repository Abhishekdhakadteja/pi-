import type { MetadataRoute } from "next";

/** Lets the app be added to an Android home screen as "Clinic Easy". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clinic Easy",
    short_name: "Clinic Easy",
    description: "Clinic Easy: clinic OS for doctors, and find-a-doctor + daily routine for everyone",
    start_url: "/",
    display: "standalone",
    background_color: "#050b1a",
    theme_color: "#050b1a",
    shortcuts: [
      { name: "डॉक्टर खोजें", short_name: "डॉक्टर", url: "/health/doctors", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "मेरा दिन", short_name: "मेरा दिन", url: "/health/routine", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
