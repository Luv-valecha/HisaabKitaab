import { allocate, MoneyError } from "./money.js";
/** Convert a split definition into exact per-user owed amounts that sum to `total`. */
export function computeSplits(total, input) {
  if (!Number.isInteger(total) || total <= 0)
    throw new MoneyError("Amount must be greater than zero");
  switch (input.type) {
    case "EQUAL": {
      const ids = [...new Set(input.participants)];
      if (ids.length === 0)
        throw new MoneyError("At least one participant is required");
      const parts = allocate(
        total,
        ids.map(() => 1),
      );
      return ids.map((userId, i) => ({ userId, owed: parts[i] }));
    }
    case "EXACT": {
      const entries = Object.entries(input.amounts);
      if (entries.length === 0)
        throw new MoneyError("At least one participant is required");
      if (entries.some(([, v]) => !Number.isInteger(v) || v < 0))
        throw new MoneyError("Invalid exact amount");
      const sum = entries.reduce((a, [, v]) => a + v, 0);
      if (sum !== total)
        throw new MoneyError(
          `Exact amounts add up to ${sum} paise but the total is ${total} paise`,
        );
      return entries.map(([userId, owed]) => ({ userId, owed }));
    }
    case "PERCENT": {
      const entries = Object.entries(input.basisPoints);
      if (entries.length === 0)
        throw new MoneyError("At least one participant is required");
      if (entries.some(([, v]) => !Number.isInteger(v) || v < 0))
        throw new MoneyError("Invalid percentage");
      const sum = entries.reduce((a, [, v]) => a + v, 0);
      if (sum !== 10000)
        throw new MoneyError("Percentages must add up to exactly 100%");
      const parts = allocate(
        total,
        entries.map(([, v]) => v),
      );
      return entries.map(([userId], i) => ({ userId, owed: parts[i] }));
    }
    case "SHARES": {
      const entries = Object.entries(input.shares);
      if (entries.length === 0)
        throw new MoneyError("At least one participant is required");
      if (entries.some(([, v]) => !Number.isInteger(v) || v < 0))
        throw new MoneyError("Shares must be whole numbers");
      if (entries.every(([, v]) => v === 0))
        throw new MoneyError("At least one share is required");
      const parts = allocate(
        total,
        entries.map(([, v]) => v),
      );
      return entries.map(([userId], i) => ({ userId, owed: parts[i] }));
    }
  }
}
