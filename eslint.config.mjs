import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  // Data-loading hooks and theme/auth sync intentionally set state from effects.
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**", ".pgdata/**"]),
]);
