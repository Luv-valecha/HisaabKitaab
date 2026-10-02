export class MoneyError extends Error {}
/** Parse a user-entered rupee string/number ("1500", "12.5", "12.50") into paise. */
export function rupeesToPaise(input) {
  const s = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new MoneyError(`Invalid amount: "${s}"`);
  const [whole, frac = ""] = s.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise)) throw new MoneyError("Amount too large");
  return paise;
}
export function paiseToRupees(p) {
  const sign = p < 0 ? "-" : "";
  const abs = Math.abs(p);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
export function formatINR(p) {
  const sign = p < 0 ? "-" : "";
  const abs = Math.abs(p);
  const rupees = Math.floor(abs / 100).toLocaleString("en-IN");
  const frac = abs % 100;
  return `${sign}₹${rupees}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
}
/**
 * Split `total` across `weights` proportionally using the largest-remainder method.
 * Guarantees: results are integers and sum EXACTLY to `total`.
 * Ties are broken by index so the result is deterministic.
 */
export function allocate(total, weights) {
  if (!Number.isInteger(total) || total < 0)
    throw new MoneyError("Total must be a non-negative integer");
  if (weights.length === 0) throw new MoneyError("No weights");
  if (weights.some((w) => !Number.isInteger(w) || w < 0))
    throw new MoneyError("Weights must be non-negative integers");
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new MoneyError("Weights must sum to more than zero");
  const bt = BigInt(total),
    bs = BigInt(sum);
  const base = weights.map((w) => Number((bt * BigInt(w)) / bs));
  const rem = weights.map((w, i) => ({ i, r: Number((bt * BigInt(w)) % bs) }));
  let left = total - base.reduce((a, b) => a + b, 0);
  rem.sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k++, left--) base[rem[k % rem.length].i] += 1;
  return base;
}
