// Development seed data. Usage: npm run db:seed   (DEV ONLY - credentials below are public)
import * as users from "../repositories/users.js";
import * as auth from "../services/authService.js";
import * as friends from "../services/friendService.js";
import * as groups from "../services/groupService.js";
import * as expenses from "../services/expenseService.js";
import * as settlements from "../services/settlementService.js";
import * as personal from "../services/personalService.js";
import * as budgets from "../services/budgetService.js";
import * as recurring from "../services/recurringService.js";
import * as categories from "../repositories/categories.js";
import { getPool } from "../lib/db/pool.js";

const PASSWORD = "Password123!";
if (await users.findByUsername("alice")) { console.log("Seed data already present (user 'alice' exists). Nothing to do."); await getPool().end(); process.exit(0); }

const mk = async (username, displayName) => (await auth.register({ username, email: `${username}@example.com`, displayName, password: PASSWORD })).user;
const alice = await mk("alice", "Alice"), bob = await mk("bob", "Bob"), charlie = await mk("charlie", "Charlie"), david = await mk("david", "David");

const befriend = async (a, b) => { const r = await friends.sendRequest(a.id, b.username); await friends.acceptRequest(b.id, r.friendshipId); };
await befriend(alice, bob); await befriend(alice, charlie); await befriend(alice, david); await befriend(bob, charlie);

const cat = Object.fromEntries((await categories.listForUser(alice.id)).map((c) => [c.name, c.id]));
// "offset days ago", but never earlier than the 1st of this month so the demo account always shows current-month data.
const day = (offset) => {
  const d = new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
  const first = new Date().toISOString().slice(0, 8) + "01";
  return d < first ? first : d;
};

const goa = await groups.create(alice.id, { name: "Goa Trip", description: "Beach week" });
for (const u of [bob, charlie, david]) await groups.addMember(alice.id, goa.id, u.id);
const flat = await groups.create(alice.id, { name: "Flatmates" });
await groups.addMember(alice.id, flat.id, bob.id); await groups.addMember(alice.id, flat.id, charlie.id);

const eq = (...u) => ({ type: "EQUAL", participants: u.map((x) => x.id) });
await expenses.create(alice.id, goa.id, { amount: "6000", description: "Hotel", categoryId: cat.Travel, date: day(9), paidBy: alice.id, split: eq(alice, bob, charlie, david) });
await expenses.create(bob.id, goa.id, { amount: "2400", description: "Seafood dinner", categoryId: cat.Food, date: day(8), paidBy: bob.id, split: { type: "SHARES", shares: { [alice.id]: 2, [bob.id]: 1, [charlie.id]: 1, [david.id]: 2 } } });
await expenses.create(charlie.id, goa.id, { amount: "1800", description: "Scooter rental", categoryId: cat.Transport, date: day(7), paidBy: charlie.id, split: { type: "EXACT", amounts: { [alice.id]: "600", [bob.id]: "600", [charlie.id]: "600" } } });
await expenses.create(david.id, goa.id, { amount: "1000", description: "Club night", categoryId: cat.Entertainment, date: day(6), paidBy: david.id, split: { type: "PERCENT", percentages: { [alice.id]: "40", [david.id]: "60" } } });
await expenses.create(alice.id, flat.id, { amount: "1500", description: "Groceries", categoryId: cat.Groceries, date: day(3), paidBy: alice.id, split: eq(alice, bob, charlie) });
await expenses.create(bob.id, flat.id, { amount: "900", description: "Wi-Fi", categoryId: cat.Bills, date: day(2), paidBy: bob.id, split: eq(alice, bob, charlie) });
await settlements.record(bob.id, goa.id, { fromUser: bob.id, toUser: alice.id, amount: "500", note: "Part payment" });

const month = new Date().toISOString().slice(0, 7);
for (const [d, desc, amt, c] of [[1, "Lunch", "220", "Food"], [2, "Metro card", "500", "Transport"], [4, "Books", "850", "Education"], [5, "Movie", "400", "Entertainment"], [7, "Pharmacy", "310", "Healthcare"]]) {
  await personal.create(alice.id, { kind: "EXPENSE", amount: amt, description: desc, categoryId: cat[c], date: day(d) });
}
await personal.create(alice.id, { kind: "INCOME", amount: "5000", description: "Pocket money", categoryId: cat.Allowance, date: day(1) });
await budgets.setIncome(alice.id, { month, income: "50000" });
await budgets.setBudget(alice.id, { month, categoryId: cat.Food, limit: "8000" });
await budgets.setBudget(alice.id, { month, categoryId: cat.Entertainment, limit: "3000" });
await budgets.setBudget(alice.id, { month, categoryId: cat.Transport, limit: "4000" });
await budgets.setBudget(alice.id, { month, categoryId: null, limit: "25000" });
await recurring.create(alice.id, { target: "PERSONAL", frequency: "MONTHLY", startDate: `${month}-28`, description: "Netflix", amount: "649", categoryId: cat.Entertainment });

console.log("Seeded. Log in with any of: alice, bob, charlie, david  /  password: " + PASSWORD);
await getPool().end();
