"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/themes/ThemeProvider";
import { useApi } from "@/hooks/useApi";
import ThemeLoader from "@/components/themes/ThemeLoader";
import Icon from "./Icon";

const NAV = [
  ["/dashboard", "Home", "home"], ["/groups", "Groups", "groups"], ["/friends", "Friends", "friends"], ["/budget", "Budget", "budget"],
  ["/analytics", "Analytics", "chart"], ["/settlements", "Settlements", "settle"], ["/themes", "Themes", "theme"], ["/profile", "Profile", "user"],
];
const MOBILE = [["/dashboard", "Home", "home"], ["/groups", "Groups", "groups"], null, ["/analytics", "Analytics", "chart"], ["/budget", "Budget", "budget"]];
const active = (path, href) => path === href || path.startsWith(href + "/");

export default function AppShell({ children }) {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const notes = useApi(user ? "/api/notifications" : null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (!user) return; const t = setInterval(notes.reload, 60000); return () => clearInterval(t); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user) return <div className="grid min-h-dvh place-items-center"><ThemeLoader /></div>;
  const unread = notes.data?.unread ?? 0;
  const navCls = `nav-${theme.nav} border-line bg-[var(--nav-bg)]`;

  return (
    <div className="relative z-10 min-h-dvh md:flex">
      <a href="#main" className="skip-link">Skip to content</a>
      <aside className={`${navCls} hidden w-70 shrink-0 flex-col gap-1 border-r p-4 md:sticky md:top-0 md:flex md:h-dvh`}>
        <Link href="/dashboard" className="font-display mb-4 px-2 text-2xl text-accent">HisaabKitaab</Link>
        <Link href="/expenses/new" className="btn btn-primary mb-3 flex min-h-11 items-center justify-center gap-2 px-4 text-sm"><Icon name="plus" size={18} /> Add expense</Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(([href, label, icon]) => (
            <Link key={href} href={href} aria-current={active(path, href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-medium ${active(path, href) ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface hover:text-ink"}`}>
              <Icon name={icon} size={20} />{label}</Link>
          ))}
        </nav>
        <Link href="/notifications" className="mt-auto flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm text-muted hover:bg-surface">
          <Icon name="bell" size={20} />Notifications{unread > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-xs text-accent-ink">{unread}</span>}</Link>
      </aside>

      <div className="min-w-0 flex-1">
        <header className={`${navCls} sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2 md:hidden`}>
          <Link href="/dashboard" className="font-display text-xl text-accent">HisaabKitaab</Link>
          <div className="flex gap-1">
            <Link href="/notifications" aria-label={`Notifications, ${unread} unread`} className="btn relative grid h-11 w-11 place-items-center"><Icon name="bell" />
              {unread > 0 && <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[10px] text-accent-ink">{unread}</span>}</Link>
            <Link href="/profile" aria-label="Profile" className="btn grid h-11 w-11 place-items-center"><Icon name="user" /></Link>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl p-4 pb-28 sm:p-6 md:pb-10">
          <div key={path} className={`pt pt-${theme.transition}`}>{children}</div>
        </main>
      </div>

      <nav aria-label="Mobile" className={`${navCls} nav-bar fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden`}>
        {MOBILE.map((item, i) => item ? (
          <Link key={item[0]} href={item[0]} aria-current={active(path, item[0]) ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active(path, item[0]) ? "text-accent" : "text-muted"}`}><Icon name={item[2]} />{item[1]}</Link>
        ) : (
          <Link key="add" href="/expenses/new" aria-label="Add expense" className="relative flex items-center justify-center">
            <span className="btn btn-primary absolute -top-6 grid h-14 w-14 place-items-center !rounded-full shadow-lg"><Icon name="plus" size={28} /></span></Link>
        ))}
      </nav>
    </div>
  );
}
