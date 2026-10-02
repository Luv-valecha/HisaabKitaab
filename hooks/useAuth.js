"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { useTheme } from "@/components/themes/ThemeProvider";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { apply } = useTheme();

  const adopt = useCallback((u) => { setUser(u); if (u?.theme) apply(u.theme); }, [apply]); // account theme wins on any device

  useEffect(() => {
    api("GET", "/api/auth/me").then((d) => adopt(d.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, [adopt]);

  const login = useCallback(async (identifier, password) => adopt((await api("POST", "/api/auth/login", { identifier, password })).user), [adopt]);
  const register = useCallback(async (input) => adopt((await api("POST", "/api/auth/register", input)).user), [adopt]);
  const logout = useCallback(async () => { try { await api("POST", "/api/auth/logout", {}); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
