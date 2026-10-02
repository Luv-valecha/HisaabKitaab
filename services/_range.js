import { monthRange } from "../repositories/spending.js";
import { badRequest } from "../lib/api/errors.js";
import { currentMonth } from "./budgetService.js";

export function spendingRange(month) {
  const m = month ?? currentMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw badRequest("month must be YYYY-MM");
  return monthRange(m);
}
