// End-to-end API test. Needs a running server + migrated DB:  BASE_URL=http://localhost:3000 node tests/e2e.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CRON = process.env.CRON_SECRET ?? "dev-cron-secret";
let pass = 0, failN = 0;
const check = (name, cond, extra) => { if (cond) { pass++; console.log("  ok  ", name); } else { failN++; console.log("  FAIL", name, extra ?? ""); } };

class Client {
  constructor() { this.cookie = ""; }
  async call(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json", cookie: this.cookie, ...headers }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) { const kv = c.split(";")[0]; this.cookie = kv.endsWith("=") ? "" : kv; }
    return { status: res.status, ...(await res.json().catch(() => ({}))) };
  }
  get = (p) => this.call("GET", p); post = (p, b) => this.call("POST", p, b); put = (p, b) => this.call("PUT", p, b);
  del = (p) => this.call("DELETE", p); patch = (p, b) => this.call("PATCH", p, b);
}
const run = Date.now().toString(36).slice(-5);
const mk = async (n) => { const c = new Client(); const r = await c.post("/api/auth/register", { username: `${n}_${run}`, email: `${n}_${run}@example.com`, displayName: n, password: "password123" }); c.id = r.data?.user?.id; c.username = `${n}_${run}`; c.status = r.status; return c; };

console.log("Auth");
const [alice, bob, charlie, dave] = [await mk("alice"), await mk("bob"), await mk("charlie"), await mk("dave")];
check("register 201", alice.status === 201 && alice.id);
check("duplicate username -> 409", (await new Client().post("/api/auth/register", { username: alice.username, email: "x@example.com", displayName: "x", password: "password123" })).status === 409);
check("weak password -> 400", (await new Client().post("/api/auth/register", { username: "zed_" + run, email: "z@example.com", displayName: "z", password: "short" })).status === 400);
check("unauthenticated -> 401", (await new Client().get("/api/auth/me")).status === 401);
check("me works with cookie", (await alice.get("/api/auth/me")).data?.user?.username === alice.username);
check("wrong password -> 401", (await new Client().post("/api/auth/login", { identifier: alice.username, password: "nope-nope" })).status === 401);
const re = new Client(); check("login ok", (await re.post("/api/auth/login", { identifier: alice.username, password: "password123" })).status === 200);
check("cross-origin POST blocked (CSRF)", (await alice.call("POST", "/api/groups", { name: "x" }, { origin: "https://evil.example" })).status === 403);

console.log("Friends");
check("search finds user", (await alice.get(`/api/users/search?q=${bob.username.slice(0, 6)}`)).data.users.some((u) => u.username === bob.username));
const fr = await alice.post("/api/friends/requests", { username: bob.username });
check("friend request 201", fr.status === 201);
check("duplicate request -> 409", (await alice.post("/api/friends/requests", { username: bob.username })).status === 409);
check("sender can't accept own request", (await alice.post(`/api/friends/requests/${fr.data.friendshipId}/accept`)).status === 403);
check("recipient accepts", (await bob.post(`/api/friends/requests/${fr.data.friendshipId}/accept`)).status === 200);
const fr2 = await alice.post("/api/friends/requests", { username: charlie.username });
await charlie.post(`/api/friends/requests/${fr2.data.friendshipId}/accept`);
check("friends listed", (await alice.get("/api/friends")).data.friends.length === 2);
check("self-add rejected", (await alice.post("/api/friends/requests", { username: alice.username })).status === 400);

console.log("Groups & authorization");
const g = (await alice.post("/api/groups", { name: "Goa Trip" })).data.group;
check("group created", !!g?.id);
check("add friend bob", (await alice.post(`/api/groups/${g.id}/members`, { userId: bob.id })).status === 201);
await alice.post(`/api/groups/${g.id}/members`, { userId: charlie.id });
check("can't add non-friend -> 403", (await alice.post(`/api/groups/${g.id}/members`, { userId: dave.id })).status === 403);
check("outsider can't see group (404)", (await dave.get(`/api/groups/${g.id}`)).status === 404);
check("outsider can't read expenses", (await dave.get(`/api/groups/${g.id}/expenses`)).status === 404);
check("non-owner can't delete group", (await bob.del(`/api/groups/${g.id}`)).status === 403);

console.log("Expenses & balances");
const cats = (await alice.get("/api/categories")).data.categories; const food = cats.find((c) => c.name === "Food").id;
const all3 = [alice.id, bob.id, charlie.id];
const dinner = await alice.post(`/api/groups/${g.id}/expenses`, { amount: "3000", description: "Dinner", categoryId: food, paidBy: alice.id, split: { type: "EQUAL", participants: all3 } });
check("equal expense created", dinner.status === 201 && dinner.data.expense.splits.every((s) => s.owed === 100000));
const net = (b) => Object.fromEntries(b.data.members.map((m) => [m.username, m.net]));
let bal = await alice.get(`/api/groups/${g.id}/balances`);
check("net balances +2000/-1000/-1000", net(bal)[alice.username] === 200000 && net(bal)[bob.username] === -100000 && net(bal)[charlie.username] === -100000);
check("exact split must sum -> 400", (await alice.post(`/api/groups/${g.id}/expenses`, { amount: "100", description: "x", paidBy: alice.id, split: { type: "EXACT", amounts: { [alice.id]: "60", [bob.id]: "30" } } })).status === 400);
check("percent must be 100 -> 400", (await alice.post(`/api/groups/${g.id}/expenses`, { amount: "100", description: "x", paidBy: alice.id, split: { type: "PERCENT", percentages: { [alice.id]: "50", [bob.id]: "30" } } })).status === 400);
check("non-member in split -> 400", (await alice.post(`/api/groups/${g.id}/expenses`, { amount: "100", description: "x", paidBy: alice.id, split: { type: "EQUAL", participants: [alice.id, dave.id] } })).status === 400);
check("float junk amount -> 400", (await alice.post(`/api/groups/${g.id}/expenses`, { amount: "10.555", description: "x", paidBy: alice.id, split: { type: "EQUAL", participants: all3 } })).status === 400);
const cab = await bob.post(`/api/groups/${g.id}/expenses`, { amount: "100", description: "Cab", paidBy: bob.id, split: { type: "SHARES", shares: { [alice.id]: 2, [bob.id]: 1, [charlie.id]: 1 } } });
check("shares split 50/25/25", cab.data.expense.splits.map((s) => s.owed).sort((a, b) => a - b).join() === "2500,2500,5000");
const pct = await alice.post(`/api/groups/${g.id}/expenses`, { amount: "100.01", description: "Odd", paidBy: alice.id, split: { type: "PERCENT", percentages: { [alice.id]: "50", [bob.id]: "30", [charlie.id]: "20" } } });
check("percent split sums exactly to total", pct.data.expense.splits.reduce((a, s) => a + s.owed, 0) === 10001);
await alice.del(`/api/expenses/${pct.data.expense.id}`);
check("charlie (not payer/creator) can't edit", (await charlie.put(`/api/expenses/${dinner.data.expense.id}`, { amount: "1", description: "hax", paidBy: alice.id, split: { type: "EQUAL", participants: all3 } })).status === 403);
const edited = await alice.put(`/api/expenses/${dinner.data.expense.id}`, { amount: "1500", description: "Dinner", categoryId: food, paidBy: alice.id, split: { type: "EQUAL", participants: all3 } });
check("edit recalculates splits", edited.data.expense.splits.every((s) => s.owed === 50000));
bal = await alice.get(`/api/groups/${g.id}/balances`);
// dinner 1500 (alice paid, 500 each) + cab 100 (bob paid; alice 50, bob 25, charlie 25)
check("balances after edit", net(bal)[alice.username] === 100000 - 5000 && net(bal)[bob.username] === -50000 + 7500 && net(bal)[charlie.username] === -50000 - 2500, JSON.stringify(net(bal)));
check("balances sum to zero", Object.values(net(bal)).reduce((a, b) => a + b, 0) === 0);

console.log("Settle up");
check("suggestions present", bal.data.suggestions.length >= 1 && bal.data.suggestions.length <= 2);
const sug = bal.data.suggestions.find((s) => s.from.username === charlie.username);
check("charlie pays alice", sug?.to.username === alice.username);
check("can't record others' payments -> 403", (await dave.post(`/api/groups/${g.id}/settlements`, { fromUser: charlie.id, toUser: alice.id, amount: "1" })).status === 404);
check("record settlement", (await charlie.post(`/api/groups/${g.id}/settlements`, { fromUser: charlie.id, toUser: alice.id, amount: String(sug.amount / 100) })).status === 201);
bal = await alice.get(`/api/groups/${g.id}/balances`);
check("charlie settled to zero", net(bal)[charlie.username] === 0);
check("settlement history kept", (await alice.get(`/api/groups/${g.id}/settlements`)).data.settlements.length === 1);
check("can't remove member with open balance", (await alice.del(`/api/groups/${g.id}/members/${bob.id}`)).status === 400);

console.log("Personal accounting (no double counting)");
const month = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);
// fresh group so numbers are exact
const g2 = (await alice.post("/api/groups", { name: "Flat" })).data.group;
await alice.post(`/api/groups/${g2.id}/members`, { userId: bob.id }); await alice.post(`/api/groups/${g2.id}/members`, { userId: charlie.id });
await alice.post(`/api/groups/${g2.id}/expenses`, { amount: "3000", description: "Big dinner", categoryId: food, date: today, paidBy: alice.id, split: { type: "EQUAL", participants: all3 } });
await alice.post("/api/personal-transactions", { amount: "500", description: "Lunch", categoryId: food, date: today });
const dash = (await alice.get("/api/dashboard")).data;
const aliceShare = 100000 + 50000 /*dinner1 edited share 500*/ + 5000 /*cab share*/ + 0;
const exp = 100000 + 50000 + 5000 + 50000; // g2 share 1000 + g1 dinner 500 + cab 50 + personal 500
check("monthly spend counts own share, not 3000", dash.monthSpending === exp, `${dash.monthSpending} vs ${exp}`);
const an = (await alice.get("/api/analytics/shared")).data;
check("paid-for-others tracked separately", an.amountPaidForOthers >= 200000 + 100000 - 2500, String(an.amountPaidForOthers));
const incomeSet = await alice.put("/api/budgets/income", { month, income: "50000" });
check("income saved", incomeSet.data.income === 5000000);
await alice.put("/api/budgets", { month, categoryId: food, limit: "2500" });
const b = (await alice.get(`/api/budgets?month=${month}`)).data;
const foodB = b.items.find((i) => i.category === "Food");
check("budget spent/remaining/percent", foodB.spent === 200000 && foodB.remaining === 50000 && foodB.percentUsed === 80, JSON.stringify(foodB));
await alice.put("/api/budgets", { month, categoryId: food, limit: "2500" });
const notifs = (await alice.get("/api/notifications")).data.notifications.filter((n) => n.type === "BUDGET");
check("80% alert created once (deduped)", notifs.length === 1, String(notifs.length));
const bobN = (await bob.get("/api/notifications")).data.notifications;
check("bob notified of expense and debt", bobN.some((n) => /you owe/i.test(n.message)));
const pa = (await alice.get(`/api/analytics/personal?month=${month}`)).data;
check("analytics: category, trend(6), avg daily", pa.byCategory[0].name === "Food" && pa.trend.length === 6 && pa.averageDaily > 0 && pa.incomeVsExpenses.income === 5000000);

console.log("Recurring (idempotent)");
const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 2, 1)).toISOString().slice(0, 10);
const rule = await alice.post("/api/recurring", { target: "PERSONAL", frequency: "MONTHLY", startDate: start, description: "Netflix", amount: "649" });
check("rule created", rule.status === 201);
check("cron without secret -> 401", (await new Client().get("/api/cron/recurring")).status === 401);
const cron = () => new Client().call("GET", "/api/cron/recurring", null, { authorization: `Bearer ${CRON}` });
const r1 = await cron(); const r2 = await cron();
check("first run backfills 3 months", r1.data.created >= 3, JSON.stringify(r1.data));
check("second run creates nothing (no duplicates)", r2.data.created === 0, JSON.stringify(r2.data));
const grp = await alice.post("/api/recurring", { target: "GROUP", frequency: "MONTHLY", startDate: today, description: "Rent", amount: "9000", groupId: g2.id, paidBy: alice.id, split: { type: "EQUAL", participants: all3 } });
check("group rule created", grp.status === 201);
const r3 = await cron(); check("group rule generated once", r3.data.created === 1, JSON.stringify(r3.data));
check("re-run safe", (await cron()).data.created === 0);

console.log("Preferences");
check("invalid theme -> 400", (await alice.put("/api/preferences", { theme: "hulk" })).status === 400);
await alice.put("/api/preferences", { theme: "iron_man" });
const again = new Client(); await again.post("/api/auth/login", { identifier: alice.username, password: "password123" });
check("theme persists across login", (await again.get("/api/preferences")).data.theme === "iron_man");
check("logout clears session", (await (async () => { await alice.post("/api/auth/logout"); return alice.get("/api/auth/me"); })()).status === 401);

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
