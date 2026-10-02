// Web App Manifest -> served at /manifest.webmanifest. Makes the site installable from the browser.
export default function manifest() {
  return {
    name: "HisaabKitaab",
    short_name: "HisaabKitaab",
    description: "Split expenses with friends. Track your own budget.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f4",
    theme_color: "#0f766e",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", url: "/expenses/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Groups", url: "/groups", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
