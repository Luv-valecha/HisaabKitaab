/**
 * Net balance per user, derived purely from history (never stored):
 *   net = (what they paid for expenses) - (their share of expenses)
 *         + (settlements they paid out) - (settlements they received)
 * Positive = owed money. Over a closed set of records the values sum to zero.
 */
export function computeNetBalances(expenses, settlements) {
  const net = {};
  const add = (id, v) => {
    net[id] = (net[id] ?? 0) + v;
  };
  for (const e of expenses) {
    const total = e.splits.reduce((a, s) => a + s.owed, 0);
    add(e.paidBy, total);
    for (const s of e.splits) add(s.userId, -s.owed);
  }
  for (const s of settlements) {
    add(s.fromUser, s.amount);
    add(s.toUser, -s.amount);
  }
  return net;
}
/**
 * Personal-accounting view of ONE user (Section 15: no double counting).
 *  personalSpend = the user's own share of every expense they participate in
 *  paidUpfront   = cash that left their pocket for group expenses
 *  paidForOthers = paidUpfront - own share (on expenses they paid) => receivable
 * Settlements are transfers, never income or spending.
 */
export function personalShareSummary(userId, expenses) {
  let personalSpend = 0,
    paidUpfront = 0,
    paidForOthers = 0;
  for (const e of expenses) {
    const own = e.splits.find((s) => s.userId === userId)?.owed ?? 0;
    personalSpend += own;
    if (e.paidBy === userId) {
      const total = e.splits.reduce((a, s) => a + s.owed, 0);
      paidUpfront += total;
      paidForOthers += total - own;
    }
  }
  return { personalSpend, paidUpfront, paidForOthers };
}

/**
 * Direct (un-simplified) pairwise debts: "Rahul owes Luv 500".
 * For each expense, every participant (other than the payer) owes the payer their share.
 * Settlements pay debts down. Opposite directions between the same two people are netted.
 * Returns [{ from, to, amount }] with amount > 0.
 */
export function computePairwise(expenses, settlements) {
  const owes = new Map(); // "debtor|creditor" -> paise
  const bump = (debtor, creditor, v) => {
    if (debtor === creditor || v === 0) return;
    const k = `${debtor}|${creditor}`;
    owes.set(k, (owes.get(k) ?? 0) + v);
  };
  for (const e of expenses) for (const s of e.splits) bump(s.userId, e.paidBy, s.owed);
  for (const s of settlements) bump(s.toUser, s.fromUser, s.amount); // payer's debt to receiver shrinks => receiver "owes" payer reversed
  const out = [];
  const seen = new Set();
  for (const [k, v] of owes) {
    if (seen.has(k)) continue;
    const [a, b] = k.split("|");
    const rev = `${b}|${a}`;
    seen.add(k); seen.add(rev);
    const net = v - (owes.get(rev) ?? 0);
    if (net > 0) out.push({ from: a, to: b, amount: net });
    else if (net < 0) out.push({ from: b, to: a, amount: -net });
  }
  return out.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from));
}
