"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, useAction } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { post, put, fieldErrors } from "@/lib/api/client";
import { rupeesToPaise, paiseToRupees, formatINR } from "@/lib/calculations/money";
import { computeSplits } from "@/lib/calculations/splits";
import { toSplitInput } from "@/lib/calculations/splitInput";
import { Async, Button, Card, EmptyState, Field, FormError, Input, Select, Tabs, todayStr } from "@/components/common/ui";

const MODES = [["personal", "Just me"], ["friends", "With friends"], ["group", "In a group"]];
const TYPES = [["EQUAL", "Equally"], ["EXACT", "Exact ₹"], ["PERCENT", "Percent"], ["SHARES", "Shares"]];

/**
 * One form, three modes:
 *   personal - no split; saved as a personal expense/income (counts fully toward your budget)
 *   friends  - split directly with chosen friends, no group
 *   group    - split inside a group
 * Editing an existing shared expense locks the mode (group or friends).
 */
export default function ExpenseForm({ initial = null, defaultGroupId = "", defaultFriendId = "" }) {
  const { user } = useAuth();
  const router = useRouter();
  const editing = !!initial;
  const [mode, setMode] = useState(initial ? (initial.groupId ? "group" : "friends") : defaultGroupId ? "group" : defaultFriendId ? "friends" : "personal");
  const [kind, setKind] = useState("EXPENSE");
  const [groupId, setGroupId] = useState(initial?.groupId ?? defaultGroupId);

  const cats = useApi("/api/categories");
  const groups = useApi(!editing && mode === "group" ? "/api/groups" : null);
  const group = useApi(mode === "group" && groupId ? `/api/groups/${groupId}` : null);
  const friends = useApi(mode === "friends" ? "/api/friends" : null);

  const evenish = initial && Math.max(...initial.splits.map((s) => s.owed)) - Math.min(...initial.splits.map((s) => s.owed)) <= 1;
  const [f, setF] = useState({
    amount: initial ? paiseToRupees(initial.amount) : "", description: initial?.description ?? "", categoryId: initial?.category?.id ?? "",
    date: initial?.date ?? todayStr(), paidBy: initial?.paidBy.id ?? user.id, notes: initial?.notes ?? "",
  });
  // Percent/shares inputs aren't stored (only resulting amounts), so editing shows an even split or exact amounts.
  const [type, setType] = useState(initial ? (evenish ? "EQUAL" : "EXACT") : "EQUAL");
  const [sel, setSel] = useState(initial ? initial.splits.map((s) => s.userId) : mode === "friends" ? [user.id, defaultFriendId].filter(Boolean) : []);
  const [vals, setVals] = useState(initial && !evenish ? Object.fromEntries(initial.splits.map((s) => [s.userId, paiseToRupees(s.owed)])) : {});
  const { run, busy, error } = useAction();
  const errs = fieldErrors(error);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const members = useMemo(() => group.data?.group.members ?? [], [group.data]);
  // Everyone selectable in the split list.
  const people = useMemo(() => {
    if (mode === "group") return members.map((m) => ({ id: m.id, name: m.displayName }));
    const list = [{ id: user.id, name: user.displayName }, ...(friends.data?.friends ?? []).map((u) => ({ id: u.id, name: u.displayName }))];
    for (const s of initial?.splits ?? []) if (!list.some((p) => p.id === s.userId)) list.push({ id: s.userId, name: s.name });
    if (initial && !list.some((p) => p.id === initial.paidBy.id)) list.push({ id: initial.paidBy.id, name: initial.paidBy.name });
    return list;
  }, [mode, members, friends.data, user, initial]);

  // New group expense: when members load, default to everyone selected.
  useEffect(() => { if (!editing && mode === "group" && members.length) { setSel(members.map((m) => m.id)); setVals({}); } }, [mode, group.data?.group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const payerOptions = mode === "group" ? people : people.filter((p) => p.id === user.id || sel.includes(p.id));
  const payer = payerOptions.some((p) => p.id === f.paidBy) ? f.paidBy : user.id;

  const split = useMemo(() => {
    if (type === "EQUAL") return { type, participants: sel };
    if (type === "EXACT") return { type, amounts: Object.fromEntries(sel.map((i) => [i, vals[i] || "0"])) };
    if (type === "PERCENT") return { type, percentages: Object.fromEntries(sel.map((i) => [i, vals[i] || "0"])) };
    return { type, shares: Object.fromEntries(sel.map((i) => [i, Number(vals[i] ?? 1) || 0])) };
  }, [type, sel, vals]);

  // Live preview with the SAME calculation code the server uses (the server re-validates regardless).
  const preview = useMemo(() => {
    if (mode === "personal" || !f.amount || !sel.length) return null;
    try { return { parts: Object.fromEntries(computeSplits(rupeesToPaise(f.amount), toSplitInput(split)).map((p) => [p.userId, p.owed])) }; }
    catch (e) { return { error: e.message }; }
  }, [mode, f.amount, split, sel.length]);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const switchMode = (m) => { setMode(m); setVals({}); setType("EQUAL"); setSel(m === "friends" ? [user.id] : []); setF((s) => ({ ...s, paidBy: user.id })); };

  // Friends mode needs you involved and at least one other person.
  const parties = new Set([payer, ...sel, user.id]);
  const friendsProblem = mode === "friends" && (sel.length === 0 ? "Choose who shares this expense."
    : parties.size < 2 ? "Pick at least one friend." : payer !== user.id && !sel.includes(user.id) ? "You must either pay or share this expense." : null);
  const blocked = mode === "personal" ? !f.amount : mode === "group" ? !groupId || !!preview?.error || !sel.length : !!friendsProblem || !!preview?.error;

  const submit = async (e) => {
    e.preventDefault();
    const common = { amount: f.amount, description: f.description, categoryId: f.categoryId || null, date: f.date, notes: f.notes || null };
    if (mode === "personal") {
      if (await run(() => post("/api/personal-transactions", { ...common, kind }))) router.push("/budget");
      return;
    }
    const body = { ...common, paidBy: payer, split };
    const ok = await run(async () => {
      if (editing) await put(`/api/expenses/${initial.id}`, body);
      else if (mode === "group") await post(`/api/groups/${groupId}/expenses`, body);
      else await post("/api/expenses", body);
    });
    if (!ok) return;
    if (mode === "group") router.push(`/groups/${groupId}`);
    else { const others = [...parties].filter((id) => id !== user.id); router.push(others.length === 1 ? `/friends/${others[0]}` : "/friends"); }
  };

  const catKind = mode === "personal" ? kind : "EXPENSE";
  const body = (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {!editing && <Tabs tabs={MODES} value={mode} onChange={switchMode} />}
      <Card className="space-y-4">
        {mode === "group" && !editing && (
          <Field id="g" label="Group"><Select id="g" value={groupId} onChange={(e) => { setGroupId(e.target.value); setF((s) => ({ ...s, paidBy: user.id })); }} required>
            <option value="">Choose a group…</option>{(groups.data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>)}
        {mode === "personal" && <>
          <p className="text-sm text-muted">Only you - nothing to split. This counts fully toward your budget.</p>
          <Field id="k" label="Type"><Select id="k" value={kind} onChange={(e) => { setKind(e.target.value); setF((s) => ({ ...s, categoryId: "" })); }}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></Select></Field></>}
        {mode === "friends" && <p className="text-sm text-muted">Split with friends directly - no group needed. Your share counts toward your budget; the rest is tracked as money owed.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="a" label="Amount (₹)" error={errs.amount}><Input id="a" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set("amount")} required /></Field>
          <Field id="d" label="Description" error={errs.description}><Input id="d" value={f.description} onChange={set("description")} placeholder={mode === "personal" ? "Lunch" : "Dinner"} required /></Field>
          <Field id="c" label="Category"><Select id="c" value={f.categoryId} onChange={set("categoryId")}><option value="">Uncategorised</option>
            {(cats.data?.categories ?? []).filter((c) => c.kind === catKind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field id="dt" label="Date" error={errs.date}><Input id="dt" type="date" value={f.date} onChange={set("date")} required /></Field>
          {mode !== "personal" && <Field id="p" label="Paid by"><Select id="p" value={payer} onChange={set("paidBy")}>{payerOptions.map((m) => <option key={m.id} value={m.id}>{m.id === user.id ? "You" : m.name}</option>)}</Select></Field>}
          <Field id="n" label="Notes (optional)"><Input id="n" value={f.notes} onChange={set("notes")} /></Field>
        </div>
      </Card>

      {mode !== "personal" && (
        <Card>
          <h2 className="mb-3 text-lg">{mode === "friends" ? "Who's sharing this?" : "Split"}</h2>
          <Tabs tabs={TYPES} value={type} onChange={(t) => { setType(t); setVals({}); }} />
          {mode === "group" && !groupId ? <p className="text-sm text-muted">Choose a group to pick who shares this expense.</p>
            : mode === "friends" && friends.data && friends.data.friends.length === 0 && !editing
              ? <p className="text-sm text-muted">You have no friends yet. <Link href="/friends" className="text-accent underline">Find friends first</Link>.</p>
              : (mode === "group" ? group.loading && !group.data : friends.loading && !friends.data) ? <p className="text-sm text-muted">Loading…</p> : (
              <ul className="space-y-2">
                {people.map((m) => {
                  const on = sel.includes(m.id);
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <label className="flex min-h-11 flex-1 items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={on} onChange={() => toggle(m.id)} />
                        <span className="truncate">{m.id === user.id ? "You" : m.name}</span></label>
                      {on && type !== "EQUAL" && <Input aria-label={`${m.name} ${type === "PERCENT" ? "percent" : type === "SHARES" ? "shares" : "amount"}`} inputMode="decimal" className="input !w-24"
                        value={vals[m.id] ?? (type === "SHARES" ? "1" : "")} onChange={(e) => setVals((v) => ({ ...v, [m.id]: e.target.value }))} placeholder={type === "PERCENT" ? "%" : type === "SHARES" ? "1" : "₹"} />}
                      <span className="w-24 text-right text-sm tabular-nums text-muted">{on && preview?.parts ? formatINR(preview.parts[m.id] ?? 0) : ""}</span>
                    </li>);
                })}
              </ul>)}
          {preview?.error && <p role="alert" className="mt-3 text-sm text-warn">{preview.error}</p>}
          {friendsProblem && !preview?.error && <p className="mt-3 text-sm text-muted">{friendsProblem}</p>}
        </Card>)}

      {!Object.keys(errs).length && <FormError error={error} />}
      <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" busy={busy} disabled={blocked}>{editing ? "Save changes" : mode === "personal" ? "Save" : "Add expense"}</Button></div>
    </form>
  );

  if (mode === "group" && !editing) return <Async state={groups}>{({ groups: list }) => (list.length === 0 && !groupId
    ? <div className="space-y-4"><Tabs tabs={MODES} value={mode} onChange={switchMode} /><EmptyState title="No groups yet" text="Create a group - or switch to “With friends” to split without one." action={<Link href="/groups" className="btn btn-primary mt-2 px-4 py-2 text-sm">Go to groups</Link>} /></div>
    : body)}</Async>;
  return body;
}
