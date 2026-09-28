import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Allgo",
    short_name: "Allgo",
    description: "Make the plan everyone can make.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1117",
    theme_color: "#2f6fed",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
