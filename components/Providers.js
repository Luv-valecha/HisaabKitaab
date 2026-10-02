"use client";
import { ThemeProvider, ThemeFx } from "@/components/themes/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";

export default function Providers({ children }) {
  return <ThemeProvider><AuthProvider><ThemeFx /><div className="relative z-10">{children}</div></AuthProvider></ThemeProvider>;
}
