"use client";
import { useState } from "react";
import { useTheme } from "@/components/themes/ThemeProvider";
import { Button, PageHeader } from "@/components/common/ui";

/** Mini live preview: scopes the theme's own tokens onto a card so it renders exactly as the real UI would. */
function Preview({ t }) {
  const vars = { ...t.tokens, background: t.tokens["--bg-image"] && t.tokens["--bg-image"] !== "none" ? `${t.tokens["--bg-image"]}, ${t.tokens["--bg"]}` : t.tokens["--bg"],
    color: t.tokens["--ink"], fontFamily: t.tokens["--font-body"], borderRadius: t.tokens["--radius"] ?? "14px" };
  return (
    <div style={vars} className="overflow-hidden border border-[var(--line)] p-3" aria-hidden="true">
      <p style={{ fontFamily: t.tokens["--font-display"], textTransform: t.tokens["--heading-transform"] ?? "none", letterSpacing: t.tokens["--heading-tracking"] }} className="flex items-center gap-2 text-base font-bold">
        {/* Optional theme icon: hidden automatically if the file isn't provided. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/themes/${t.id}/${t.id}_icon.png`} alt="" width={22} height={22} onError={(e) => { e.currentTarget.style.display = "none"; }} />{t.name}</p>
      <div className="mt-2 p-2" style={{ background: t.tokens["--card"], border: `1px solid ${t.tokens["--line"]}`, borderRadius: t.tokens["--radius-sm"] ?? "9px" }}>
        <p className="text-[10px]" style={{ color: t.tokens["--muted"] }}>You are owed</p>
        <p className="text-lg font-bold" style={{ color: t.tokens["--pos"] }}>₹2,200</p>
        <p className="text-[10px]" style={{ color: t.tokens["--neg"] }}>You owe ₹450</p>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded px-2 py-1 text-[10px] font-semibold" style={{ background: t.tokens["--accent"], color: t.tokens["--accent-ink"] }}>Add expense</span>
        {t.preview.map((c) => <span key={c} className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: c }} />)}
      </div>
    </div>
  );
}

export default function Themes() {
  const { theme, themes, choose } = useTheme();
  const [saved, setSaved] = useState(null);
  const groups = ["Standard", "Marvel", "DC"];
  return (<>
    <PageHeader title="Theme gallery" subtitle="Pick a look. Your choice is saved to your account and follows you across devices." />
    {groups.map((g) => (
      <section key={g} className="mb-8" aria-labelledby={`g-${g}`}>
        <h2 id={`g-${g}`} className="mb-3 text-xl">{g}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.filter((t) => t.group === g).map((t) => {
            const on = theme.id === t.id;
            return (
              <article key={t.id} className={`card p-3 ${on ? "!border-accent ring-2 ring-[var(--accent)]" : ""}`}>
                <Preview t={t} />
                <p className="mt-3 text-sm text-muted">{t.tagline}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted">{saved === t.id ? "Saved ✓" : on ? "Active" : ""}</span>
                  <Button className="!min-h-10" variant={on ? "ghost" : "primary"} disabled={on} aria-label={`Use ${t.name} theme`} onClick={async () => { await choose(t.id); setSaved(t.id); }}>{on ? "In use" : "Use theme"}</Button>
                </div>
              </article>);
          })}
        </div>
      </section>))}
  </>);
}
