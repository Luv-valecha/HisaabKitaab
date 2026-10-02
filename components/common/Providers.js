"use client";
import { ThemeProvider, ThemeFx } from "@/components/themes/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { PwaProvider } from "./Pwa";

export default function Providers({ children }) {
  return <ThemeProvider><PwaProvider><ThemeFx /><AuthProvider>{children}</AuthProvider></PwaProvider></ThemeProvider>;
}
