import * as repo from "../repositories/recurring.js";
import * as personalRepo from "../repositories/personal.js";
import * as groupsRepo from "../repositories/groups.js";
import { withTransaction, query } from "../lib/db/pool.js";
import { rupeesToPaise, paiseToRupees } from "../lib/calculations/money.js";
import { computeSplits } from "../lib/calculations/splits.js";
import { dueOccurrences } from "../lib/calculations/recurrence.js";
import { badRequest, notFound } from "../lib/api/errors.js";
import { assertMember } from "./groupService.js";
import { createInGroup } from "./expenseService.js";
import { toSplitInput } from "../lib/calculations/splitInput.js";
import { notify } from "../lib/notifications/notify.js";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" });

const dto = (r) => ({ id: r.id, target: r.target, frequency: r.frequency, startDate: r.start_date, nextRun: r.next_run,
  endDate: r.end_date, active: r.active, description: r.description, amount: r.amount_paise, groupId: r.group_id });

export async function create(userId, input) {
  const amountPaise = rupeesToPaise(input.amount);
  if (amountPaise <= 0) throw badRequest("Amount must be greater than zero");
  if (input.endDate && input.endDate < input.startDate) throw badRequest("End date must be after the start date");
  let splitTemplate = null;
  if (input.target === "GROUP") {
    await assertMember(input.groupId, userId);
    const members = new Set((await groupsRepo.listMembers(input.groupId)).map((m) => m.id));
    const paidBy = input.paidBy ?? userId;
    if (!members.has(paidBy)) throw badRequest("The payer must be a member of the group");
    const parts = computeSplits(amountPaise, toSplitInput(input.split)); // validate now, not at 3am
    if (parts.some((p) => !members.has(p.userId))) throw badRequest("Everyone in the split must be a member of the group");
    splitTemplate = { paidBy, split: input.split };
  }
  return dto(await repo.insert({ userId, ...input, amountPaise, splitTemplate }));
}
export const list = async (userId) => (await repo.listForUser(userId)).map(dto);
export async function setActive(userId, id, active) { if (!(await repo.setActive(userId, id, active))) throw notFound("Recurring expense not found"); }
export async function remove(userId, id) { if (!(await repo.removeOwn(userId, id))) throw notFound("Recurring expense not found"); }

async function processRule(id, todayStr) {
  return withTransaction(async (db) => {
    const r = await repo.lockById(db, id);
    if (!r || !r.active || r.next_run > todayStr) return 0; // someone else already handled it
    const { dates, next } = dueOccurrences(r.next_run, todayStr, r.frequency, r.start_date, r.end_date);
    let created = 0;
    for (const date of dates) {
      // Existence check + unique index (recurring_id, occurrence_date) => never a duplicate, even on re-runs.
      const tbl = r.target === "PERSONAL" ? "personal_transactions" : "expenses";
      const exists = (await db.query(`SELECT 1 FROM ${tbl} WHERE recurring_id=$1 AND occurrence_date=$2`, [r.id, date])).rowCount;
      if (exists) continue;
      if (r.target === "PERSONAL") {
        await personalRepo.insert(r.user_id, { kind: "EXPENSE", amountPaise: r.amount_paise, description: r.description,
          categoryId: r.category_id, date, recurringId: r.id, occurrenceDate: date }, db);
      } else {
        const t = r.split_template;
        await createInGroup({ groupId: r.group_id, createdBy: r.user_id, recurringId: r.id, occurrenceDate: date, db,
          input: { amount: paiseToRupees(r.amount_paise), description: r.description, categoryId: r.category_id, date, paidBy: t.paidBy, split: t.split } });
      }
      created++;
    }
    const finished = r.end_date && next > r.end_date;
    await repo.advance(db, r.id, next, !finished);
    return created;
  });
}

/** Called by the cron endpoint. Safe to run any number of times per day. */
export async function runDue(todayStr = today()) {
  const ids = await repo.dueIds(todayStr);
  let created = 0, failed = 0;
  for (const id of ids) {
    try { created += await processRule(id, todayStr); }
    catch (e) {
      failed++;
      console.error(`recurring rule ${id} failed:`, e.message);
      const r = (await query("SELECT user_id, description FROM recurring_rules WHERE id=$1", [id])).rows[0];
      if (r) {
        await query("UPDATE recurring_rules SET active=false WHERE id=$1", [id]);
        await notify({ userId: r.user_id, type: "RECURRING_FAILED", message: `Recurring expense "${r.description}" was paused because it could not be created (${e.message}).`, dedupeKey: `recfail:${id}` });
      }
    }
  }
  return { rulesProcessed: ids.length, created, failed, date: todayStr };
}
