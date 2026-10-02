"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/themes/ThemeProvider";

/** Reads the active theme's colours so charts follow the theme. */
export function usePalette() {
  const { theme } = useTheme();
  const [p, setP] = useState({ accent: "#0f766e", accent2: "#2563eb", pos: "#15803d", neg: "#c2410c", ink: "#16202a", muted: "#5d6b76", line: "#dfe3dd", warn: "#b45309" });
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const g = (v, d) => cs.getPropertyValue(v).trim() || d;
    setP({ accent: g("--accent", "#0f766e"), accent2: g("--accent2", "#2563eb"), pos: g("--pos", "#15803d"), neg: g("--neg", "#c2410c"),
      ink: g("--ink", "#16202a"), muted: g("--muted", "#5d6b76"), line: g("--line", "#dfe3dd"), warn: g("--warn", "#b45309") });
  }, [theme.id]);
  return { ...p, series: [p.accent, p.accent2, p.pos, p.warn, p.neg, p.muted, p.ink] };
}
