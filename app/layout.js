import "./globals.css";
import Providers from "@/components/common/Providers";

export const metadata = {
  title: "HisaabKitaab",
  description: "Split expenses with friends. Track your own budget.",
  applicationName: "HisaabKitaab",
  appleWebApp: { capable: true, title: "HisaabKitaab", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f766e" };

// Runs before first paint so the saved theme never flashes the default one.
const themeScript = `try{var t=localStorage.getItem("hk_theme");if(t&&/^[a-z_]+$/.test(t))document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh"><Providers>{children}</Providers></body>
    </html>
  );
}
