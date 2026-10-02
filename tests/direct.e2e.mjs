// E2E for expenses split directly between friends (no group). Needs a running server + migrated DB.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0, failN = 0;
const check = (name, cond, extra) => { if (cond) { pass++; console.log("  ok  ", name); } else { failN++; console.log("  FAIL", name, extra ?? ""); } };
class Client {
  constructor() { this.cookie = ""; }
  async call(method, path, body) {
    const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json", cookie: this.cookie }, body: body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie?.() ?? []) { const kv = c.split(";")[0]; this.cookie = kv.endsWith("=") ? "" : kv; }
    return { status: res.status, ...(await res.json().catch(() => ({}))) };
  }
  get = (p) => this.call("GET", p); post = (p, b) => this.call("POST", p, b ?? {}); put = (p, b) => this.call("PUT", p, b); del = (p) => this.call("DELETE", p);
}
const run = Date.now().toString(36).slice(-5);
const mk = async (n) => { const c = new Client(); const r = await c.post("/api/auth/register", { username: `${n}_${run}`, email: `${n}_${run}@example.com`, displayName: n, password: "password123" }); c.id = r.data.user.id; c.username = `${n}_${run}`; return c; };
const befriend = async (a, b) => { const r = await a.post("/api/friends/requests", { username: b.username }); await b.post(`/api/friends/requests/${r.data.friendshipId}/accept`); return r.data.friendshipId; };
const net = async (c, otherId) => (await c.get(`/api/friends/ledger/${otherId}`)).data.net;
const month = new Date().toISOString().slice(0, 7), today = new Date().toISOString().slice(0, 10);

const [alice, bob, carol, dan] = [await mk("alice"), await mk("bob"), await mk("carol"), await mk("dan")];
const fAB = await befriend(alice, bob); await befriend(alice, dan);

console.log("Create (no group)");
const e1 = await alice.post("/api/expenses", { amount: "900", description: "Cab", date: today, paidBy: alice.id, split: { type: "EQUAL", participants: [alice.id, bob.id] } });
check("equal split with a friend, no group -> 201", e1.status === 201 && e1.data.expense.groupId === null && e1.data.expense.splits.every((s) => s.owed === 45000));
check("bob owes alice 450", (await net(alice, bob.id)) === 45000 && (await net(bob, alice.id)) === -45000);
const e2 = await alice.post("/api/expenses", { amount: "1000", description: "Concert", date: today, paidBy: alice.id, split: { type: "EXACT", amounts: { [alice.id]: "300", [bob.id]: "700" } } });
check("exact amounts per friend", e2.status === 201 && (await net(alice, bob.id)) === 115000);
const e3 = await alice.post("/api/expenses", { amount: "100.01", description: "Snacks", date: today, paidBy: alice.id, split: { type: "PERCENT", percentages: { [alice.id]: "50", [bob.id]: "30", [dan.id]: "20" } } });
check("percent split across two friends sums exactly", e3.status === 201 && e3.data.expense.splits.reduce((a, s) => a + s.owed, 0) === 10001);
await alice.del(`/api/expenses/${e3.data.expense.id}`);
const e4 = await alice.post("/api/expenses", { amount: "400", description: "Pizza", date: today, paidBy: alice.id, split: { type: "SHARES", shares: { [alice.id]: 2, [bob.id]: 1, [dan.id]: 1 } } });
check("shares across several friends", e4.status === 201 && e4.data.expense.splits.map((s) => s.owed).sort((a, b) => a - b).join() === "10000,10000,20000");
await alice.del(`/api/expenses/${e4.data.expense.id}`);
check("balance back after deletes", (await net(alice, bob.id)) === 115000 && (await net(alice, dan.id)) === 0);

console.log("Rules");
const bad = (b) => alice.post("/api/expenses", { amount: "100", description: "x", paidBy: alice.id, split: { type: "EQUAL", participants: [alice.id, bob.id] }, ...b });
check("non-friend in split -> 403", (await bad({ split: { type: "EQUAL", participants: [alice.id, carol.id] } })).status === 403);
check("only me -> 400", (await bad({ split: { type: "EQUAL", participants: [alice.id] } })).status === 400);
check("I'm not involved -> 400", (await bad({ paidBy: bob.id, split: { type: "EQUAL", participants: [bob.id, dan.id] } })).status === 400);
check("exact not summing -> 400", (await bad({ split: { type: "EXACT", amounts: { [alice.id]: "10", [bob.id]: "10" } } })).status === 400);
check("percent not 100 -> 400", (await bad({ split: { type: "PERCENT", percentages: { [alice.id]: "50", [bob.id]: "10" } } })).status === 400);
check("unauthenticated -> 401", (await new Client().post("/api/expenses", {})).status === 401);

console.log("Friend pays, edit, permissions");
const e5 = await bob.post("/api/expenses", { amount: "200", description: "Tea", date: today, paidBy: bob.id, split: { type: "EQUAL", participants: [alice.id, bob.id] } });
check("friend can create, alice owes 100 -> net 1050", e5.status === 201 && (await net(alice, bob.id)) === 105000);
check("involved non-creator can't edit -> 403", (await bob.put(`/api/expenses/${e2.data.expense.id}`, { amount: "1", description: "x", paidBy: alice.id, split: { type: "EQUAL", participants: [alice.id, bob.id] } })).status === 403);
check("outsider can't see it -> 404", (await carol.get(`/api/expenses/${e2.data.expense.id}`)).status === 404);
check("participant can read it", (await bob.get(`/api/expenses/${e2.data.expense.id}`)).status === 200);
const ed = await alice.put(`/api/expenses/${e2.data.expense.id}`, { amount: "1000", description: "Concert", date: today, paidBy: alice.id, split: { type: "EQUAL", participants: [alice.id, bob.id] } });
check("creator edits, balance recalculated (450+500+(-100))", ed.status === 200 && (await net(alice, bob.id)) === 45000 + 50000 - 10000);
check("friends/balances agrees with ledger (SQL vs calc)", (await alice.get("/api/friends/balances")).data.balances.find((b) => b.userId === bob.id).net === (await net(alice, bob.id)));

console.log("Settle, dashboard, personal accounting");
const owed = await net(alice, bob.id);
check("outsider can't settle with non-friend -> 404", (await carol.post("/api/friends/settlements", { fromUser: carol.id, toUser: alice.id, amount: "1" })).status === 404);
check("can't record someone else's payment -> 403", (await carol.post("/api/friends/settlements", { fromUser: alice.id, toUser: bob.id, amount: "1" })).status === 403);
check("bob settles in full", (await bob.post("/api/friends/settlements", { fromUser: bob.id, toUser: alice.id, amount: String(owed / 100) })).status === 201 && (await net(alice, bob.id)) === 0);
check("settlement shows in history as 'Between friends'", (await alice.get("/api/settlements")).data.settlements.some((s) => s.groupName === "Between friends"));
const e6 = await alice.post("/api/expenses", { amount: "300", description: "Lunch", date: today, paidBy: alice.id, split: { type: "EQUAL", participants: [alice.id, dan.id] } });
const dash = (await alice.get("/api/dashboard")).data;
check("dashboard owed includes friend balance (dan owes 150)", dash.owed === 15000 && dash.net === 15000, JSON.stringify(dash));
// alice's own shares this month: cab 450 + concert 500 + tea 100 + lunch 150 = 1200 (NOT the 2400 gross)
check("monthly spending = own shares only (1200, not gross)", dash.monthSpending === 120000, String(dash.monthSpending));
const solo = await alice.post("/api/personal-transactions", { kind: "EXPENSE", amount: "80", description: "Chai", date: today });
check("personal (no split) expense still works", solo.status === 201 && (await alice.get("/api/dashboard")).data.monthSpending === 128000);

console.log("Unfriending never strands money");
await alice.del(`/api/friends/${(await alice.get("/api/friends")).data.friends.find((f) => f.id === dan.id).friendshipId}`);
check("ledger still reachable while a balance exists", (await alice.get(`/api/friends/ledger/${dan.id}`)).data.net === 15000);
check("can still settle", (await dan.post("/api/friends/settlements", { fromUser: dan.id, toUser: alice.id, amount: "150" })).status === 201);
check("never-related user -> 404", (await alice.get(`/api/friends/ledger/${carol.id}`)).status === 404);
await alice.del(`/api/expenses/${e6.data.expense.id}`);

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
