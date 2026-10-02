"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";

/** GET a path and track loading/error state. Pass path=null to skip. `reload()` refetches. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!path) return;
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const data = await api("GET", path); if (n === seq.current) setState({ data, error: null, loading: false }); }
    catch (error) { if (n === seq.current) setState({ data: null, error, loading: false }); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** Wrap a mutation: run(fn) sets busy/error and resolves true/false. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); return true; } catch (e) { setError(e); return false; } finally { setBusy(false); }
  }, []);
  return { run, busy, error, clear: () => setError(null) };
}
