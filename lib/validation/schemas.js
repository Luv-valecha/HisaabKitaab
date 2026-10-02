import { z } from "zod";

export const uuid = z.string().uuid();
const amountInput = z.union([z.string(), z.number()]); // rupees; parsed to paise by rupeesToPaise
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

export const registerSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "3-20 characters: letters, numbers, underscore"),
  email: z.string().trim().email().max(120),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(8, "At least 8 characters").max(72),
});
export const loginSchema = z.object({ identifier: z.string().trim().toLowerCase().min(1), password: z.string().min(1) });

export const groupSchema = z.object({ name: z.string().trim().min(1).max(60), description: z.string().trim().max(300).optional() });
export const addMemberSchema = z.object({ userId: uuid });

export const splitSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EQUAL"), participants: z.array(uuid).min(1) }),
  z.object({ type: z.literal("EXACT"), amounts: z.record(uuid, amountInput) }),
  z.object({ type: z.literal("PERCENT"), percentages: z.record(uuid, z.union([z.string(), z.number()])) }),
  z.object({ type: z.literal("SHARES"), shares: z.record(uuid, z.number().int().min(0)) }),
]);

export const expenseSchema = z.object({
  amount: amountInput,
  description: z.string().trim().min(1).max(120),
  categoryId: uuid.nullish(),
  date: dateStr.optional(),
  paidBy: uuid,
  notes: z.string().trim().max(500).nullish(),
  split: splitSchema,
});

export const settlementSchema = z.object({
  fromUser: uuid, toUser: uuid, amount: amountInput, note: z.string().trim().max(200).nullish(),
});

export const personalTxnSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
  amount: amountInput, description: z.string().trim().min(1).max(120),
  categoryId: uuid.nullish(), date: dateStr.optional(), notes: z.string().trim().max(500).nullish(),
});

const monthStr = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");
export const budgetSchema = z.object({
  month: monthStr, categoryId: uuid.nullish(), limit: amountInput,
});
export const incomeSchema = z.object({ month: monthStr, income: amountInput });

export const recurringSchema = z.object({
  target: z.enum(["PERSONAL", "GROUP"]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: dateStr, endDate: dateStr.nullish(),
  description: z.string().trim().min(1).max(120), amount: amountInput,
  categoryId: uuid.nullish(), groupId: uuid.nullish(),
  split: splitSchema.nullish(), paidBy: uuid.nullish(),
}).refine((v) => v.target !== "GROUP" || (v.groupId && v.split), { message: "Group recurring expenses need groupId and split" });

export const themeSchema = z.object({ theme: z.enum([
  "light","dark","iron_man","spider_man","thor","venom","doctor_strange","captain_america",
  "moon_knight","loki","batman","superman","flash","wonder_woman"]) });

export const categorySchema = z.object({ name: z.string().trim().min(1).max(30), kind: z.enum(["EXPENSE","INCOME"]).default("EXPENSE") });
