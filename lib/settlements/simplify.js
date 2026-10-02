/**
 * Debt simplification (greedy net-balance matching).
 *
 * Input: net balance per user in paise. Positive = is owed money (creditor),
 * negative = owes money (debtor). Balances must sum to zero.
 *
 * Algorithm:
 *  1. Split users into creditors (>0) and debtors (<0); ignore zero balances.
 *  2. Repeatedly pair the LARGEST debtor with the LARGEST creditor.
 *  3. Transfer min(|debt|, credit); at least one party is fully settled each step.
 *  4. Stop when everyone is at zero.
 *
 * Produces at most (n - 1) transfers for n people with non-zero balances.
 * (Finding the true minimum is NP-hard; greedy is the standard practical approach.)
 * Ties are broken by user id for determinism.
 */
export function simplifyDebts(net) {
  const entries = Object.entries(net);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total !== 0) throw new Error(`Balances must sum to zero (got ${total})`);
  if (entries.some(([, v]) => !Number.isInteger(v)))
    throw new Error("Balances must be integers");
  const cmp = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
  const creditors = entries
    .filter(([, v]) => v > 0)
    .map(([k, v]) => [k, v])
    .sort(cmp);
  const debtors = entries
    .filter(([, v]) => v < 0)
    .map(([k, v]) => [k, -v])
    .sort(cmp);
  const out = [];
  while (creditors.length && debtors.length) {
    const [cid, credit] = creditors[0];
    const [did, debt] = debtors[0];
    const amount = Math.min(credit, debt);
    out.push({ from: did, to: cid, amount });
    creditors[0][1] -= amount;
    debtors[0][1] -= amount;
    if (creditors[0][1] === 0) creditors.shift();
    if (debtors[0][1] === 0) debtors.shift();
    creditors.sort(cmp);
    debtors.sort(cmp);
  }
  return out;
}
