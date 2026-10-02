import { rupeesToPaise } from "./money.js";

/** Convert the API split DTO (rupee / percent strings) into computeSplits() input (integers). Pure: used by server AND browser. */
export function toSplitInput(split) {
  switch (split.type) {
    case "EQUAL": return { type: "EQUAL", participants: split.participants };
    case "EXACT": return { type: "EXACT", amounts: Object.fromEntries(Object.entries(split.amounts).map(([k, v]) => [k, rupeesToPaise(v)])) };
    case "PERCENT": return { type: "PERCENT", basisPoints: Object.fromEntries(Object.entries(split.percentages).map(([k, v]) => [k, rupeesToPaise(v)])) };
    case "SHARES": return { type: "SHARES", shares: Object.fromEntries(Object.entries(split.shares).filter(([, v]) => v > 0)) };
  }
}
