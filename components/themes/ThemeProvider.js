"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { THEMES, getTheme, DEFAULT_THEME } from "@/themes/registry";
import { api } from "@/lib/api/client";
import { INSTALLED_ASSETS } from "@/themes/assets.generated";

const Ctx = createContext(null);
const KEY = "hk_theme";

export function ThemeProvider({ children }) {
  const [id, setId] = useState(DEFAULT_THEME);

  // The inline script in layout.js already set data-theme before paint; mirror it into React state.
  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) setId(getTheme(stored).id);
  }, []);

  const apply = useCallback((next) => {
    const t = getTheme(next);
    setId(t.id);
    document.documentElement.dataset.theme = t.id;
    try { localStorage.setItem(KEY, t.id); } catch {}
    // Keep the browser / installed-app title bar colour in sync with the theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (meta && bg) meta.setAttribute("content", bg);
  }, []);

  /** User picks a theme: apply instantly, then persist to the account (best effort). */
  const choose = useCallback(async (next, { persist = true } = {}) => {
    apply(next);
    if (persist) { try { await api("PUT", "/api/preferences", { theme: next }); } catch {} }
  }, [apply]);

  const value = useMemo(() => ({ theme: getTheme(id), themes: THEMES, choose, apply }), [id, choose, apply]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Renders the fixed background effect for the active theme (+ optional installed background image). */
export function ThemeFx() {
  const { theme } = useTheme();
  const bg = INSTALLED_ASSETS[theme.id]?.background; // optional real artwork; falls back to the CSS effect alone
  if (theme.fx === "none" && !bg) return null;
  return (
    <div className={`fx-layer ${theme.fx === "none" ? "" : `fx-${theme.fx}`}`} aria-hidden="true">
      {bg && <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${bg})` }} />}
    </div>
  );
}
