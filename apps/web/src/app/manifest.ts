import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TeachTimer.io",
    short_name: "TeachTimer",
    description: "A fast classroom timer for lesson transitions.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#1a5eff",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
