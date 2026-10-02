/**
 * THEME REGISTRY - the single source of truth for every theme.
 *
 * To add a theme: add one entry here, then run `node scripts/gen-theme-css.mjs`.
 * No UI component needs to change. A theme controls:
 *   tokens      colours, fonts, radius, shadows, backgrounds (become CSS variables)
 *   fx          background effect id            (styles/fx.css      -> .fx-<id>)
 *   loader      loading animation id            (components/themes/ThemeLoader.js)
 *   transition  page-transition id              (styles/motion.css  -> .pt-<id>)
 *   emptyArt    empty-state illustration id     (components/themes/EmptyArt.js)
 *   nav         navigation style: "solid" | "glass" | "outline"
 *   preview     3 swatches shown in the gallery
 *
 * All art is abstract/original (rings, bolts, crescents...). No copyrighted logos or images are used.
 * Optional photo/illustration assets are looked up in /assets/themes/<id>/ and fall back gracefully.
 */
const f = {
  sans: `ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
  tech: `"Bahnschrift", "DIN Alternate", "Segoe UI", system-ui, sans-serif`,
  comic: `"Comic Sans MS", "Chalkboard SE", "Trebuchet MS", system-ui, sans-serif`,
  serif: `Georgia, "Times New Roman", serif`,
  impact: `Impact, "Arial Narrow Bold", "Haettenschweiler", "Franklin Gothic Bold", sans-serif`,
  mono: `ui-monospace, "Cascadia Mono", Consolas, monospace`,
  display: `"Trebuchet MS", "Gill Sans", system-ui, sans-serif`,
};

const base = {
  "--radius": "14px", "--radius-sm": "9px", "--shadow": "0 1px 2px rgb(0 0 0 / .06), 0 6px 20px rgb(0 0 0 / .06)",
  "--font-body": f.sans, "--font-display": f.sans, "--heading-weight": "700", "--heading-transform": "none", "--heading-tracking": "-0.01em",
  "--card-border": "1px solid var(--line)", "--btn-weight": "600", "--bg-image": "none",
};

export const THEMES = [
  { id: "light", name: "Light", group: "Standard", tagline: "Clean and calm.", fx: "none", loader: "ring", transition: "fade", emptyArt: "coin", nav: "solid",
    preview: ["#f6f7f4", "#0f766e", "#16202a"],
    tokens: { "--bg": "#f6f7f4", "--surface": "#eef0ec", "--card": "#ffffff", "--ink": "#16202a", "--muted": "#5d6b76", "--line": "#dfe3dd",
      "--accent": "#0f766e", "--accent-ink": "#ffffff", "--accent2": "#2563eb", "--pos": "#15803d", "--neg": "#c2410c", "--warn": "#b45309", "--nav-bg": "#ffffff" } },
  { id: "dark", name: "Dark", group: "Standard", tagline: "Easy on the eyes.", fx: "none", loader: "ring", transition: "fade", emptyArt: "coin", nav: "solid",
    preview: ["#10151a", "#2dd4bf", "#e6edf3"],
    tokens: { "--bg": "#10151a", "--surface": "#171e25", "--card": "#1c252d", "--ink": "#e6edf3", "--muted": "#94a3b0", "--line": "#2a3641",
      "--accent": "#2dd4bf", "--accent-ink": "#06201d", "--accent2": "#60a5fa", "--pos": "#4ade80", "--neg": "#fb923c", "--warn": "#fbbf24", "--nav-bg": "#171e25",
      "--shadow": "0 1px 2px rgb(0 0 0 / .4), 0 8px 24px rgb(0 0 0 / .3)" } },

  // ---------- Marvel ----------
  { id: "iron_man", name: "Iron Man", group: "Marvel", tagline: "Red, gold and a HUD that never sleeps.", fx: "hud", loader: "arc", transition: "hud", emptyArt: "arc", nav: "outline",
    preview: ["#140a0a", "#e11d2e", "#f5b83d"],
    tokens: { "--bg": "#120808", "--surface": "#1b0d0d", "--card": "#221111", "--ink": "#fbeee0", "--muted": "#c4a08a", "--line": "#5a2a22",
      "--accent": "#f5b83d", "--accent-ink": "#2a1300", "--accent2": "#e11d2e", "--pos": "#6ee7a8", "--neg": "#ff6b5e", "--warn": "#f5b83d", "--nav-bg": "#1b0d0d",
      "--font-display": f.tech, "--font-body": f.tech, "--heading-transform": "uppercase", "--heading-tracking": ".06em", "--radius": "6px", "--radius-sm": "4px",
      "--card-border": "1px solid #7a3326", "--shadow": "0 0 0 1px #3a1a14, 0 0 22px rgb(225 29 46 / .18)",
      "--bg-image": "radial-gradient(1200px 600px at 80% -10%, rgb(225 29 46 / .25), transparent 60%), radial-gradient(900px 500px at 0% 110%, rgb(245 184 61 / .12), transparent 60%)" } },
  { id: "spider_man", name: "Spider-Man", group: "Marvel", tagline: "Friendly neighbourhood budgeting.", fx: "web", loader: "web", transition: "web", emptyArt: "web", nav: "solid",
    preview: ["#0b1330", "#e11d48", "#2563eb"],
    tokens: { "--bg": "#0b1230", "--surface": "#101a40", "--card": "#15214f", "--ink": "#f4f6ff", "--muted": "#a5b0d9", "--line": "#2b3a78",
      "--accent": "#ef2b4b", "--accent-ink": "#ffffff", "--accent2": "#3b82f6", "--pos": "#5eead4", "--neg": "#ff7a8c", "--warn": "#fcd34d", "--nav-bg": "#101a40",
      "--font-display": f.comic, "--heading-weight": "800", "--radius": "12px", "--card-border": "2px solid #0a0f26", "--shadow": "4px 4px 0 #0a0f26",
      "--bg-image": "linear-gradient(160deg, #0b1230 0%, #1a1f5c 55%, #4a1230 130%)" } },
  { id: "thor", name: "Thor", group: "Marvel", tagline: "Worthy spending only.", fx: "storm", loader: "bolt", transition: "lightning", emptyArt: "bolt", nav: "glass",
    preview: ["#0c1424", "#7dd3fc", "#fbbf24"],
    tokens: { "--bg": "#0a111f", "--surface": "#101a2e", "--card": "#142138", "--ink": "#eaf4ff", "--muted": "#9ab4d0", "--line": "#27415f",
      "--accent": "#7dd3fc", "--accent-ink": "#04202e", "--accent2": "#fbbf24", "--pos": "#86efac", "--neg": "#fda4af", "--warn": "#fbbf24", "--nav-bg": "rgb(16 26 46 / .85)",
      "--font-display": f.serif, "--heading-weight": "800", "--heading-tracking": ".01em", "--shadow": "0 0 24px rgb(125 211 252 / .12)",
      "--bg-image": "radial-gradient(900px 500px at 50% -20%, rgb(125 211 252 / .22), transparent 65%), linear-gradient(180deg,#0a111f,#0d1626)" } },
  { id: "venom", name: "Venom", group: "Marvel", tagline: "We are in debt. We are also in budget.", fx: "ooze", loader: "blob", transition: "ink", emptyArt: "blob", nav: "solid",
    preview: ["#050505", "#e5e5e5", "#7c3aed"],
    tokens: { "--bg": "#050506", "--surface": "#0c0c10", "--card": "#121218", "--ink": "#f1f1f4", "--muted": "#a0a0b0", "--line": "#2a2a36",
      "--accent": "#e9e9ef", "--accent-ink": "#0a0a0f", "--accent2": "#8b5cf6", "--pos": "#a3e635", "--neg": "#f472b6", "--warn": "#facc15", "--nav-bg": "#0c0c10",
      "--font-display": f.impact, "--heading-weight": "400", "--heading-transform": "uppercase", "--heading-tracking": ".05em", "--radius": "22px 8px 22px 8px", "--radius-sm": "12px 4px 12px 4px",
      "--shadow": "0 0 28px rgb(139 92 246 / .16)" } },
  { id: "doctor_strange", name: "Doctor Strange", group: "Marvel", tagline: "Fourteen million possible budgets.", fx: "mandala", loader: "mandala", transition: "portal", emptyArt: "mandala", nav: "glass",
    preview: ["#1a0f08", "#f97316", "#fcd34d"],
    tokens: { "--bg": "#160d07", "--surface": "#20130a", "--card": "#2a190d", "--ink": "#fdf0dc", "--muted": "#cfa987", "--line": "#5c3a1c",
      "--accent": "#f97316", "--accent-ink": "#1f0d00", "--accent2": "#fcd34d", "--pos": "#a7f3d0", "--neg": "#fca5a5", "--warn": "#fcd34d", "--nav-bg": "rgb(32 19 10 / .88)",
      "--font-display": f.serif, "--font-body": f.sans, "--heading-weight": "700", "--heading-tracking": ".03em", "--radius": "16px", "--shadow": "0 0 30px rgb(249 115 22 / .18)",
      "--bg-image": "radial-gradient(800px 600px at 85% 0%, rgb(249 115 22 / .22), transparent 60%), radial-gradient(700px 500px at 0% 100%, rgb(127 29 29 / .35), transparent 60%)" } },
  { id: "captain_america", name: "Captain America", group: "Marvel", tagline: "Stand for what you owe.", fx: "stars", loader: "shield", transition: "iris", emptyArt: "shield", nav: "solid",
    preview: ["#0f2a5c", "#d62839", "#f8fafc"],
    tokens: { "--bg": "#0d2350", "--surface": "#112c64", "--card": "#15357a", "--ink": "#f8fbff", "--muted": "#b7c6e6", "--line": "#2b4d93",
      "--accent": "#e63946", "--accent-ink": "#ffffff", "--accent2": "#f8fafc", "--pos": "#a7f3d0", "--neg": "#ffb4b4", "--warn": "#fde68a", "--nav-bg": "#112c64",
      "--font-display": f.display, "--heading-weight": "800", "--heading-transform": "uppercase", "--heading-tracking": ".05em", "--radius": "12px", "--card-border": "2px solid #f8fafc22",
      "--bg-image": "linear-gradient(180deg, #0d2350 0%, #0b1c40 100%)" } },
  { id: "moon_knight", name: "Moon Knight", group: "Marvel", tagline: "Every phase, accounted for.", fx: "moon", loader: "crescent", transition: "moon", emptyArt: "crescent", nav: "outline",
    preview: ["#0b0d12", "#e8e6df", "#9aa4b8"],
    tokens: { "--bg": "#0a0c11", "--surface": "#10131a", "--card": "#161a23", "--ink": "#eeece6", "--muted": "#9aa1b2", "--line": "#2a3040",
      "--accent": "#e8e6df", "--accent-ink": "#0b0d12", "--accent2": "#8aa0c8", "--pos": "#9be7c4", "--neg": "#f0a4a4", "--warn": "#e8d28a", "--nav-bg": "#10131a",
      "--font-display": f.serif, "--heading-weight": "600", "--heading-tracking": ".08em", "--heading-transform": "uppercase", "--radius": "10px",
      "--bg-image": "radial-gradient(600px 400px at 15% 0%, rgb(232 230 223 / .10), transparent 60%)" } },
  { id: "loki", name: "Loki", group: "Marvel", tagline: "Glorious purpose. Glorious purchases.", fx: "shimmer", loader: "illusion", transition: "illusion", emptyArt: "horns", nav: "solid",
    preview: ["#0c1a14", "#16a34a", "#d4af37"],
    tokens: { "--bg": "#0a1712", "--surface": "#0f2019", "--card": "#142a21", "--ink": "#eef6ec", "--muted": "#9dbba9", "--line": "#27493a",
      "--accent": "#d4af37", "--accent-ink": "#1b1500", "--accent2": "#22c55e", "--pos": "#86efac", "--neg": "#fda4af", "--warn": "#fcd34d", "--nav-bg": "#0f2019",
      "--font-display": f.serif, "--heading-weight": "700", "--heading-tracking": ".04em", "--radius": "14px 14px 4px 14px",
      "--bg-image": "linear-gradient(135deg, #0a1712 0%, #123524 60%, #1b2a12 120%)" } },

  // ---------- DC ----------
  { id: "batman", name: "Batman", group: "DC", tagline: "It's not who owes. It's what you settle.", fx: "gotham", loader: "signal", transition: "shadow", emptyArt: "signal", nav: "solid",
    preview: ["#0a0a0b", "#facc15", "#3f3f46"],
    tokens: { "--bg": "#08080a", "--surface": "#101013", "--card": "#16161a", "--ink": "#ededf0", "--muted": "#9a9aa6", "--line": "#2c2c34",
      "--accent": "#facc15", "--accent-ink": "#141000", "--pos": "#86efac", "--neg": "#fb923c", "--warn": "#facc15", "--nav-bg": "#101013",
      "--font-display": f.impact, "--heading-weight": "400", "--heading-transform": "uppercase", "--heading-tracking": ".06em", "--radius": "4px", "--radius-sm": "3px",
      "--bg-image": "linear-gradient(180deg, #0c0c10 0%, #060607 100%)" } },
  { id: "superman", name: "Superman", group: "DC", tagline: "Up, up and away from overdue.", fx: "sky", loader: "flight", transition: "swoosh", emptyArt: "diamond", nav: "solid",
    preview: ["#0b3d91", "#e11d2e", "#facc15"],
    tokens: { "--bg": "#0a3a8c", "--surface": "#0d4aa8", "--card": "#115ac4", "--ink": "#f7fbff", "--muted": "#c3d8f6", "--line": "#3d7be0",
      "--accent": "#ef233c", "--accent-ink": "#ffffff", "--accent2": "#facc15", "--pos": "#bbf7d0", "--neg": "#fecaca", "--warn": "#fde047", "--nav-bg": "#0d4aa8",
      "--font-display": f.display, "--heading-weight": "800", "--radius": "16px",
      "--bg-image": "linear-gradient(180deg, #0a3a8c 0%, #1465d8 100%)" } },
  { id: "flash", name: "Flash", group: "DC", tagline: "Settle up before you finish reading this.", fx: "speed", loader: "speed", transition: "speed", emptyArt: "bolt", nav: "solid",
    preview: ["#7f1d1d", "#fde047", "#dc2626"],
    tokens: { "--bg": "#6f1414", "--surface": "#861a1a", "--card": "#9a2020", "--ink": "#fff7ed", "--muted": "#f5c9b8", "--line": "#c24a3a",
      "--accent": "#fde047", "--accent-ink": "#3a0b00", "--pos": "#bef264", "--neg": "#fed7aa", "--warn": "#fde047", "--nav-bg": "#861a1a",
      "--font-display": f.impact, "--heading-weight": "400", "--heading-transform": "uppercase", "--heading-tracking": ".05em", "--radius": "10px 22px 10px 22px",
      "--bg-image": "linear-gradient(115deg, #6f1414 0%, #a31f1f 100%)" } },
  { id: "wonder_woman", name: "Wonder Woman", group: "DC", tagline: "Truth in every ledger.", fx: "gold", loader: "lasso", transition: "lasso", emptyArt: "lasso", nav: "solid",
    preview: ["#1a2a5e", "#c1121f", "#e9b949"],
    tokens: { "--bg": "#14224e", "--surface": "#1b2d66", "--card": "#223677", "--ink": "#fff8ec", "--muted": "#cdd5ee", "--line": "#4358a0",
      "--accent": "#e9b949", "--accent-ink": "#2a1d00", "--accent2": "#d62839", "--pos": "#bbf7d0", "--neg": "#fecaca", "--warn": "#fde68a", "--nav-bg": "#1b2d66",
      "--font-display": f.serif, "--heading-weight": "700", "--heading-tracking": ".04em", "--radius": "18px 18px 6px 18px",
      "--bg-image": "linear-gradient(160deg, #14224e 0%, #3a1a4a 130%)" } },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = "light";
export const getTheme = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];
export const themeBase = base;
