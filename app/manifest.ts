import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HeatSignal",
    short_name: "HeatSignal",
    description: "Heat, air quality and UV risk for your city, with what to do about it.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#ffffff",
    orientation: "portrait-primary",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
