// Generates styles/themes.generated.css from themes/registry.js. Run: node scripts/gen-theme-css.mjs
import fs from "node:fs";
import { THEMES, themeBase } from "../themes/registry.js";

const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}\n`;
let css = "/* AUTO-GENERATED from themes/registry.js - do not edit by hand. */\n";
css += block(":root", { ...themeBase, ...THEMES[0].tokens });
for (const t of THEMES) {
  css += block(`:root[data-theme="${t.id}"]`, { ...themeBase, "--accent2": t.tokens["--accent"], ...t.tokens,
    // Optional artwork: if the file does not exist the browser silently ignores it (see docs/ASSETS_REQUIRED.md).
    "--theme-bg-image": `url("/assets/themes/${t.id}/${t.id}_background.png")` });
}
fs.writeFileSync("styles/themes.generated.css", css);
console.log(`Wrote ${THEMES.length} themes.`);
