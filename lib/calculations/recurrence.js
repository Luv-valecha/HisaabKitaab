/** Pure date math for recurring rules. Dates are 'YYYY-MM-DD' strings; arithmetic is done in UTC. */
const pad = (n) => String(n).padStart(2, "0");
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
const fmt = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * The occurrence after `current`. `start` is the anchor date, so a rule that starts on
 * Jan 31 runs Jan 31, Feb 28, Mar 31 (clamped, then returns to 31) rather than drifting to the 28th forever.
 */
export function nextOccurrence(current, frequency, start) {
  const c = parse(current), a = parse(start);
  switch (frequency) {
    case "DAILY":
    case "WEEKLY": {
      const dt = new Date(Date.UTC(c.y, c.m - 1, c.d + (frequency === "DAILY" ? 1 : 7)));
      return fmt({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
    }
    case "MONTHLY": {
      let y = c.y, m = c.m + 1;
      if (m > 12) { m = 1; y += 1; }
      return fmt({ y, m, d: Math.min(a.d, daysIn(y, m)) });
    }
    case "YEARLY": {
      const y = c.y + 1;
      return fmt({ y, m: a.m, d: Math.min(a.d, daysIn(y, a.m)) });
    }
    default: throw new Error(`Unknown frequency ${frequency}`);
  }
}

/** All occurrence dates from `from` (inclusive) up to `until` (inclusive), capped for safety. */
export function dueOccurrences(from, until, frequency, start, endDate = null, cap = 400) {
  const out = [];
  let cur = from;
  while (cur <= until && (!endDate || cur <= endDate) && out.length < cap) {
    out.push(cur);
    cur = nextOccurrence(cur, frequency, start);
  }
  return { dates: out, next: cur };
}
