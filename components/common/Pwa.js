"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const Ctx = createContext({ canInstall: false, installed: false, isIos: false, install: async () => {} });

/** Registers the service worker (production only) and captures the browser's install prompt. */
export function PwaProvider({ children }) {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW registration failed", e));
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const install = useCallback(async () => {
    if (!evt) return;
    evt.prompt();
    await evt.userChoice.catch(() => {});
    setEvt(null);
  }, [evt]);

  const value = useMemo(() => ({ canInstall: !!evt && !installed, installed, isIos, install }), [evt, installed, isIos, install]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const usePwa = () => useContext(Ctx);

/** Install button / iOS hint. Renders nothing when already installed or unsupported. */
export function InstallApp({ className = "" }) {
  const { canInstall, installed, isIos, install } = usePwa();
  if (installed) return <p className="text-sm text-muted">✓ Installed as an app on this device.</p>;
  if (canInstall) return <button onClick={install} className={`btn btn-primary min-h-11 px-4 text-sm ${className}`}>Install HisaabKitaab</button>;
  if (isIos) return <p className="text-sm text-muted">To install on iPhone/iPad: tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>;
  return <p className="text-sm text-muted">To install: open your browser menu and choose <b>Install app</b> (Chrome/Edge) when available.</p>;
}
