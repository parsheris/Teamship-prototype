import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spark Kiosk — Plastic Ingenuity Feedback",
    short_name: "Spark Kiosk",
    description:
      "Share anonymous workplace feedback on the kiosk and review submissions in the admin dashboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f1ea",
    theme_color: "#f5f1ea",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  }
}
