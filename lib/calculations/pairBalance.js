/**
 * Balance between two people from non-group (direct) records.
 * Returns what `other` owes `me` in paise: positive = they owe me, negative = I owe them.
 *  - expense I paid       -> they owe me THEIR share
 *  - expense they paid    -> I owe them MY share
 *  - settlement they paid me -> they owe me less ; settlement I paid them -> they owe me more
 */
export function pairBalance(me, other, expenses, settlements) {
  let net = 0;
  for (const e of expenses) {
    if (e.paidBy === me) net += e.splits.find((s) => s.userId === other)?.owed ?? 0;
    else if (e.paidBy === other) net -= e.splits.find((s) => s.userId === me)?.owed ?? 0;
  }
  for (const s of settlements) {
    if (s.fromUser === other && s.toUser === me) net -= s.amount;
    else if (s.fromUser === me && s.toUser === other) net += s.amount;
  }
  return net;
}
