import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Second Opinion",
    short_name: "2nd Opinion",
    description: "Peer health exam for astronaut crews. Works offline.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b09",
    theme_color: "#0b0b09",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
