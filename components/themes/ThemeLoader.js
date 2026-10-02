"use client";
import { useTheme } from "./ThemeProvider";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" };
const SVG = ({ children }) => <svg viewBox="0 0 64 64" aria-hidden="true">{children}</svg>;

const LOADERS = {
  ring: () => <SVG><circle cx="32" cy="32" r="22" {...S} opacity=".2" /><circle className="ld-spin" cx="32" cy="32" r="22" {...S} strokeDasharray="40 100" /></SVG>,
  // Iron Man: arc-reactor style concentric rings
  arc: () => <SVG><circle className="ld-spin-slow" cx="32" cy="32" r="28" {...S} strokeDasharray="10 6" /><circle className="ld-spin-rev" cx="32" cy="32" r="20" {...S} strokeDasharray="30 8" stroke="var(--accent2)" /><circle className="ld-pulse" cx="32" cy="32" r="9" fill="currentColor" /></SVG>,
  web: () => <SVG><g className="ld-spin-slow" {...S} strokeWidth="1.6">{Array.from({ length: 8 }, (_, i) => <line key={i} x1="32" y1="32" x2={32 + 28 * Math.cos((i * Math.PI) / 4)} y2={32 + 28 * Math.sin((i * Math.PI) / 4)} />)}{[10, 19, 28].map((r) => <polygon key={r} points={Array.from({ length: 8 }, (_, i) => `${32 + r * Math.cos((i * Math.PI) / 4)},${32 + r * Math.sin((i * Math.PI) / 4)}`).join(" ")} />)}</g><circle className="ld-pulse" cx="32" cy="32" r="3.5" fill="var(--accent2)" /></SVG>,
  bolt: () => <SVG><path className="ld-flicker" d="M36 4 14 36h14l-4 24 26-34H36z" fill="currentColor" stroke="var(--accent2)" strokeWidth="1.5" strokeLinejoin="round" /></SVG>,
  blob: () => <div className="ld-blob" />,
  mandala: () => <SVG><circle className="ld-spin" cx="32" cy="32" r="26" {...S} strokeDasharray="4 7" /><circle className="ld-spin-rev" cx="32" cy="32" r="18" {...S} strokeDasharray="14 6" stroke="var(--accent2)" /><g className="ld-spin-slow" fill="var(--accent2)">{Array.from({ length: 8 }, (_, i) => <circle key={i} cx={32 + 26 * Math.cos((i * Math.PI) / 4)} cy={32 + 26 * Math.sin((i * Math.PI) / 4)} r="2" />)}</g></SVG>,
  shield: () => <SVG><g className="ld-pulse"><circle cx="32" cy="32" r="28" fill="var(--accent)" /><circle cx="32" cy="32" r="21" fill="#f8fafc" /><circle cx="32" cy="32" r="14" fill="var(--accent)" /><circle cx="32" cy="32" r="8" fill="#1d4ed8" /></g></SVG>,
  crescent: () => <SVG><defs><mask id="moonmask"><rect width="64" height="64" fill="#fff" /><circle className="ld-phase" cx="40" cy="32" r="22" fill="#000" /></mask></defs><circle cx="32" cy="32" r="22" fill="currentColor" mask="url(#moonmask)" /></SVG>,
  illusion: () => <SVG><circle className="ld-ghost" cx="32" cy="32" r="22" {...S} stroke="var(--accent2)" /><circle className="ld-ghost" style={{ animationDirection: "alternate-reverse" }} cx="32" cy="32" r="22" {...S} /><path d="M18 24 26 10l6 12 6-12 8 14" {...S} strokeWidth="2" opacity=".8" /></SVG>,
  // Batman: abstract searchlight cone (no logo)
  signal: () => <SVG><path className="ld-pulse" d="M32 58 10 6h44z" fill="currentColor" opacity=".25" /><ellipse className="ld-pulse" cx="32" cy="50" rx="14" ry="6" fill="currentColor" /></SVG>,
  flight: () => <SVG><g {...S}><path className="ld-slide" d="M6 24h34" /><path className="ld-slide" style={{ animationDelay: ".3s" }} d="M12 34h40" /><path className="ld-slide" style={{ animationDelay: ".6s" }} d="M4 44h28" /></g><path className="ld-pulse" d="M46 22 58 32 46 42" {...S} stroke="var(--accent2)" /></SVG>,
  speed: () => <SVG><g {...S}><path className="ld-slide" d="M4 18h36" /><path className="ld-slide" style={{ animationDelay: ".15s" }} d="M10 30h46" /><path className="ld-slide" style={{ animationDelay: ".3s" }} d="M6 42h30" /><path className="ld-slide" style={{ animationDelay: ".45s" }} d="M14 52h40" /></g></SVG>,
  lasso: () => <SVG><circle className="ld-spin" cx="32" cy="32" r="22" {...S} strokeDasharray="3 5" strokeWidth="4" /><circle className="ld-spin-rev" cx="32" cy="32" r="14" {...S} stroke="var(--accent2)" strokeDasharray="20 10" /></SVG>,
};

export default function ThemeLoader({ label = "Loading", className = "" }) {
  const { theme } = useTheme();
  const L = LOADERS[theme.loader] ?? LOADERS.ring;
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}>
      <span className="ld"><L /></span>
      <span className="text-sm text-muted">{label}…</span>
    </div>
  );
}
