"use client";
import { useTheme } from "./ThemeProvider";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" };
const ART = {
  coin: <><circle cx="40" cy="40" r="24" {...P} /><path d="M40 28v24M33 34h10a5 5 0 0 1 0 10H33" {...P} /></>,
  arc: <><circle cx="40" cy="40" r="26" {...P} /><circle cx="40" cy="40" r="16" {...P} strokeDasharray="6 5" /><circle cx="40" cy="40" r="6" fill="currentColor" /></>,
  web: <g {...P} strokeWidth="1.8">{Array.from({ length: 8 }, (_, i) => <line key={i} x1="40" y1="40" x2={40 + 30 * Math.cos((i * Math.PI) / 4)} y2={40 + 30 * Math.sin((i * Math.PI) / 4)} />)}{[10, 20, 30].map((r) => <circle key={r} cx="40" cy="40" r={r} />)}</g>,
  bolt: <path d="M46 8 20 44h18l-4 28 28-38H44z" {...P} />,
  blob: <path d="M18 46c-4-14 6-28 22-28s26 10 20 26-6 20-22 18-16-2-20-16z" {...P} />,
  mandala: <><circle cx="40" cy="40" r="28" {...P} strokeDasharray="3 6" /><circle cx="40" cy="40" r="18" {...P} /><path d="M40 22v36M22 40h36" {...P} /></>,
  shield: <><path d="M40 10 64 18v20c0 16-10 26-24 32C26 64 16 54 16 38V18z" {...P} /><circle cx="40" cy="38" r="9" {...P} /></>,
  crescent: <path d="M52 14a28 28 0 1 0 14 40A24 24 0 0 1 52 14z" {...P} />,
  horns: <><path d="M20 58V34c0-10-8-14-8-24 10 2 18 12 20 24M60 58V34c0-10 8-14 8-24-10 2-18 12-20 24" {...P} /><path d="M26 60h28" {...P} /></>,
  signal: <><ellipse cx="40" cy="58" rx="18" ry="7" {...P} /><path d="M26 56 14 14h52L54 56" {...P} /></>,
  diamond: <path d="M22 18h36l12 14-30 36L10 32z M10 32h60" {...P} />,
  lasso: <><circle cx="40" cy="40" r="26" {...P} strokeDasharray="2 7" strokeWidth="4" /><circle cx="40" cy="40" r="14" {...P} /></>,
};

export default function EmptyArt({ size = 96 }) {
  const { theme } = useTheme();
  return <svg width={size} height={size} viewBox="0 0 80 80" className="text-accent" aria-hidden="true">{ART[theme.emptyArt] ?? ART.coin}</svg>;
}
