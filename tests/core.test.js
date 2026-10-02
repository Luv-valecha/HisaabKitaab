import { describe, it, expect } from "vitest";
import {
  rupeesToPaise,
  paiseToRupees,
  allocate,
  formatINR,
} from "../lib/calculations/money";
import { computeSplits } from "../lib/calculations/splits";
import { simplifyDebts } from "../lib/settlements/simplify";
import {
  computeNetBalances,
  personalShareSummary,
} from "../lib/calculations/balances";
const sum = (a) => a.reduce((x, y) => x + y, 0);
describe("money", () => {
  it("parses rupees exactly", () => {
    expect(rupeesToPaise("1500")).toBe(150000);
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(() => rupeesToPaise("1.234")).toThrow();
    expect(() => rupeesToPaise("-5")).toThrow();
    expect(() => rupeesToPaise("abc")).toThrow();
  });
  it("formats", () => {
    expect(paiseToRupees(1999)).toBe("19.99");
    expect(formatINR(12345600)).toBe("₹1,23,456");
  });
  it("allocate always sums exactly", () => {
    for (let t = 1; t < 400; t += 7)
      for (const w of [
        [1, 1, 1],
        [2, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [3333, 3333, 3334],
      ]) {
        expect(sum(allocate(t, w))).toBe(t);
      }
  });
});
describe("splits", () => {
  it("equal 1500/3", () => {
    expect(
      computeSplits(150000, {
        type: "EQUAL",
        participants: ["a", "b", "c"],
      }).map((s) => s.owed),
    ).toEqual([50000, 50000, 50000]);
  });
  it("equal with remainder sums exactly", () => {
    const r = computeSplits(10000, {
      type: "EQUAL",
      participants: ["a", "b", "c"],
    });
    expect(sum(r.map((s) => s.owed))).toBe(10000);
    expect(r.map((s) => s.owed)).toEqual([3334, 3333, 3333]);
  });
  it("exact validates sum", () => {
    expect(() =>
      computeSplits(1500, { type: "EXACT", amounts: { a: 700, b: 500 } }),
    ).toThrow();
    expect(
      computeSplits(1500, {
        type: "EXACT",
        amounts: { a: 700, b: 500, c: 300 },
      }),
    ).toHaveLength(3);
  });
  it("percent validates 100% and sums exactly", () => {
    expect(() =>
      computeSplits(1000, {
        type: "PERCENT",
        basisPoints: { a: 5000, b: 4000 },
      }),
    ).toThrow();
    const r = computeSplits(10001, {
      type: "PERCENT",
      basisPoints: { a: 5000, b: 3000, c: 2000 },
    });
    expect(sum(r.map((s) => s.owed))).toBe(10001);
  });
  it("shares 2:1:1", () => {
    expect(
      computeSplits(40000, {
        type: "SHARES",
        shares: { a: 2, b: 1, c: 1 },
      }).map((s) => s.owed),
    ).toEqual([20000, 10000, 10000]);
    expect(() =>
      computeSplits(100, { type: "SHARES", shares: { a: 0 } }),
    ).toThrow();
    expect(() =>
      computeSplits(100, { type: "SHARES", shares: { a: 1.5 } }),
    ).toThrow();
  });
});
describe("simplifyDebts", () => {
  it("cycle A->B 500, B->C 500, C->A 200 simplifies to 1 transfer", () => {
    const e = [
      { paidBy: "B", splits: [{ userId: "A", owed: 500 }] },
      { paidBy: "C", splits: [{ userId: "B", owed: 500 }] },
      { paidBy: "A", splits: [{ userId: "C", owed: 200 }] },
    ];
    expect(simplifyDebts(computeNetBalances(e, []))).toEqual([
      { from: "A", to: "C", amount: 300 },
    ]);
  });
  it("handles many debtors/creditors and zeros; transfers clear all balances", () => {
    const net = { a: 700, b: 300, c: -400, d: -600, e: 0 };
    const t = simplifyDebts(net);
    const after = { ...net };
    for (const x of t) {
      after[x.from] += x.amount;
      after[x.to] -= x.amount;
    }
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
    expect(t.length).toBeLessThanOrEqual(3);
  });
  it("rejects non-zero-sum", () => {
    expect(() => simplifyDebts({ a: 1 })).toThrow();
  });
});
describe("balances & personal accounting", () => {
  const dinner = {
    paidBy: "luv",
    splits: [
      { userId: "luv", owed: 100000 },
      { userId: "r", owed: 100000 },
      { userId: "a", owed: 100000 },
    ],
  };
  it("net balances", () => {
    expect(computeNetBalances([dinner], [])).toEqual({
      luv: 200000,
      r: -100000,
      a: -100000,
    });
  });
  it("settlement reduces debt", () => {
    const n = computeNetBalances(
      [dinner],
      [{ fromUser: "r", toUser: "luv", amount: 100000 }],
    );
    expect(n).toEqual({ luv: 100000, r: 0, a: -100000 });
  });
  it("Section 15: 3000 dinner => personal spend 1000, upfront 3000, receivable 2000", () => {
    expect(personalShareSummary("luv", [dinner])).toEqual({
      personalSpend: 100000,
      paidUpfront: 300000,
      paidForOthers: 200000,
    });
    expect(personalShareSummary("r", [dinner])).toEqual({
      personalSpend: 100000,
      paidUpfront: 0,
      paidForOthers: 0,
    });
  });
});

import { computePairwise } from "../lib/calculations/balances";
describe("pairwise", () => {
  it("who owes whom, nets opposite directions and applies settlements", () => {
    const e = [
      { paidBy: "luv", splits: [{ userId: "luv", owed: 100 }, { userId: "r", owed: 500 }, { userId: "a", owed: 300 }] },
      { paidBy: "r", splits: [{ userId: "luv", owed: 200 }, { userId: "r", owed: 0 }] },
    ];
    expect(computePairwise(e, [])).toEqual([
      { from: "a", to: "luv", amount: 300 }, { from: "r", to: "luv", amount: 300 }]);
    expect(computePairwise(e, [{ fromUser: "r", toUser: "luv", amount: 300 }])).toEqual([{ from: "a", to: "luv", amount: 300 }]);
  });
});

import { nextOccurrence, dueOccurrences } from "../lib/calculations/recurrence";
describe("recurrence", () => {
  it("monthly keeps the anchor day with month-end clamping", () => {
    expect(nextOccurrence("2026-01-31", "MONTHLY", "2026-01-31")).toBe("2026-02-28");
    expect(nextOccurrence("2026-02-28", "MONTHLY", "2026-01-31")).toBe("2026-03-31");
    expect(nextOccurrence("2026-12-15", "MONTHLY", "2026-01-15")).toBe("2027-01-15");
  });
  it("weekly/daily/yearly", () => {
    expect(nextOccurrence("2026-12-28", "WEEKLY", "2026-12-28")).toBe("2027-01-04");
    expect(nextOccurrence("2026-02-28", "DAILY", "2026-02-28")).toBe("2026-03-01");
    expect(nextOccurrence("2028-02-29", "YEARLY", "2028-02-29")).toBe("2029-02-28");
  });
  it("catch-up generates every missed date once and respects end date", () => {
    const r = dueOccurrences("2026-07-01", "2026-10-01", "MONTHLY", "2026-07-01");
    expect(r.dates).toEqual(["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(r.next).toBe("2026-11-01");
    expect(dueOccurrences("2026-07-01", "2026-10-01", "MONTHLY", "2026-07-01", "2026-08-15").dates).toHaveLength(2);
  });
});

import { pairBalance } from "../lib/calculations/pairBalance";
describe("pairBalance (direct friend balances)", () => {
  const e1 = { paidBy: "me", splits: [{ userId: "me", owed: 500 }, { userId: "f", owed: 500 }] };
  const e2 = { paidBy: "f", splits: [{ userId: "me", owed: 200 }, { userId: "f", owed: 200 }] };
  it("they owe me their share of what I paid, minus my share of what they paid", () => {
    expect(pairBalance("me", "f", [e1, e2], [])).toBe(300);
    expect(pairBalance("f", "me", [e1, e2], [])).toBe(-300);
  });
  it("settlements pay it down in either direction", () => {
    expect(pairBalance("me", "f", [e1, e2], [{ fromUser: "f", toUser: "me", amount: 300 }])).toBe(0);
    expect(pairBalance("me", "f", [e1], [{ fromUser: "me", toUser: "f", amount: 100 }])).toBe(600);
  });
});
