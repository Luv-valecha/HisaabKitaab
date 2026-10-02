"use client";
import { useState } from "react";
import { useApi, useAction } from "@/hooks/useApi";
import { post, put, del, patch, fieldErrors } from "@/lib/api/client";
import { paiseToRupees } from "@/lib/calculations/money";
import { Async, Button, Card, ConfirmDialog, EmptyState, Field, FormError, Input, Modal, Money, MonthPicker, PageHeader, Progress, Select, Tabs, monthNow, prettyDate, prettyMonth, todayStr } from "@/components/common/ui";

export default function Budget() {
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(monthNow());
  return (<>
    <PageHeader title="Budget" subtitle="Your own spending - group bills count only your share." actions={<MonthPicker value={month} onChange={setMonth} />} />
    <Tabs value={tab} onChange={setTab} tabs={[["overview", "Budgets"], ["txns", "My transactions"], ["recurring", "Recurring"]]} />
    {tab === "overview" && <Overview month={month} />}
    {tab === "txns" && <Transactions month={month} />}
    {tab === "recurring" && <Recurring />}
  </>);
}

function Overview({ month }) {
  const b = useApi(`/api/budgets?month=${month}`);
  const cats = useApi("/api/categories");
  const [income, setIncome] = useState("");
  const [nb, setNb] = useState({ categoryId: "", limit: "" });
  const act = useAction();
  const errs = fieldErrors(act.error);
  return (<Async state={b}>{(d) => (<div className="space-y-4">
    <Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><p className="text-sm text-muted">Monthly income</p><p className="text-2xl font-bold">{d.income === null ? "Not set" : <Money paise={d.income} />}</p></div>
        <div><p className="text-sm text-muted">Spent in {prettyMonth(month)}</p><p className="text-2xl font-bold"><Money paise={d.totalSpent} /></p></div>
        <div><p className="text-sm text-muted">Budget remaining</p><p className="text-2xl font-bold">{d.headline ? <Money paise={d.headline.remaining} signed={d.headline.remaining < 0} /> : "-"}</p></div>
      </div>
      <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await put("/api/budgets/income", { month, income }); setIncome(""); b.reload(); }); }}>
        <div className="flex-1"><Field id="inc" label="Set monthly income (₹)" error={errs.income}><Input id="inc" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="50000" /></Field></div>
        <Button type="submit" busy={act.busy} disabled={!income}>Save</Button></form>
    </Card>

    <Card><h2 className="mb-3 text-lg">Budgets</h2>
      {d.items.length === 0 ? <EmptyState title="No budgets for this month" text="Add an overall budget or one per category below." /> :
        <ul className="space-y-4">{d.items.map((i) => (<li key={i.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2"><span className="font-medium">{i.category}</span>
            <span className="text-sm text-muted"><Money paise={i.spent} /> of <Money paise={i.limit} /> · {i.percentUsed ?? 0}%</span></div>
          <Progress percent={i.percentUsed} label={`${i.category} budget used`} />
          <div className="mt-1 flex items-center justify-between text-xs"><span className={i.remaining < 0 ? "text-neg" : "text-muted"}>{i.remaining < 0 ? "Over by " : "Remaining "}<Money paise={Math.abs(i.remaining)} /></span>
            <button className="text-muted underline" onClick={() => act.run(async () => { await del(`/api/budgets/${i.id}`); b.reload(); })}>Remove</button></div></li>))}</ul>}
      <form className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await put("/api/budgets", { month, categoryId: nb.categoryId || null, limit: nb.limit }); setNb({ categoryId: "", limit: "" }); b.reload(); }); }}>
        <Field id="bc" label="Category"><Select id="bc" value={nb.categoryId} onChange={(e) => setNb({ ...nb, categoryId: e.target.value })}><option value="">Overall (all spending)</option>
          {(cats.data?.categories ?? []).filter((c) => c.kind === "EXPENSE").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field id="bl" label="Limit (₹)" error={errs.limit}><Input id="bl" inputMode="decimal" value={nb.limit} onChange={(e) => setNb({ ...nb, limit: e.target.value })} required /></Field>
        <Button type="submit" busy={act.busy}>Set budget</Button></form>
      <div className="mt-3"><FormError error={act.error && !Object.keys(errs).length ? act.error : null} /></div>
    </Card></div>)}</Async>);
}

function TxnForm({ initial, cats, onDone, onClose }) {
  const [f, setF] = useState({ kind: initial?.kind ?? "EXPENSE", amount: initial ? paiseToRupees(initial.amount) : "", description: initial?.description ?? "", categoryId: initial?.category?.id ?? "", date: initial?.date ?? todayStr(), notes: initial?.notes ?? "" });
  const { run, busy, error } = useAction();
  const errs = fieldErrors(error);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); const body = { ...f, categoryId: f.categoryId || null, notes: f.notes || null }; if (await run(() => (initial ? put(`/api/personal-transactions/${initial.id}`, body) : post("/api/personal-transactions", body)))) onDone(); };
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    <Field id="tk" label="Type"><Select id="tk" value={f.kind} onChange={set("kind")}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></Select></Field>
    <Field id="ta" label="Amount (₹)" error={errs.amount}><Input id="ta" inputMode="decimal" value={f.amount} onChange={set("amount")} required /></Field>
    <Field id="td" label="Description" error={errs.description}><Input id="td" value={f.description} onChange={set("description")} required /></Field>
    <Field id="tc" label="Category"><Select id="tc" value={f.categoryId} onChange={set("categoryId")}><option value="">Uncategorised</option>{cats.filter((c) => c.kind === f.kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
    <Field id="tdt" label="Date" error={errs.date}><Input id="tdt" type="date" value={f.date} onChange={set("date")} required /></Field>
    <Field id="tn" label="Notes (optional)"><Input id="tn" value={f.notes} onChange={set("notes")} /></Field>
    {!Object.keys(errs).length && <FormError error={error} />}
    <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>{initial ? "Save" : "Add"}</Button></div></form>);
}

function Transactions({ month }) {
  const t = useApi(`/api/personal-transactions?month=${month}`);
  const cats = useApi("/api/categories");
  const [edit, setEdit] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [rm, setRm] = useState(null);
  const act = useAction();
  const add = <Button onClick={() => setEdit(null)}>+ Add transaction</Button>;
  return (<>
    <div className="mb-3 flex justify-end">{add}</div>
    <p className="mb-3 text-xs text-muted">Shared group expenses are not listed here - they live in their groups, and only your share counts toward your budget.</p>
    <Async state={t}>{({ transactions: list }) => list.length === 0 ? <EmptyState title="No personal transactions this month" action={add} /> :
      <ul className="space-y-2">{list.map((x) => (<li key={x.id}><Card className="!p-3 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-medium">{x.description}</p><p className="text-xs text-muted">{prettyDate(x.date)} · {x.category?.name ?? "Uncategorised"}{x.recurringId ? " · recurring" : ""}</p></div>
        <div className="flex items-center gap-2"><Money paise={x.kind === "INCOME" ? x.amount : -x.amount} signed className="font-semibold" />
          <Button variant="ghost" className="!min-h-9 !px-2 text-xs" onClick={() => setEdit(x)}>Edit</Button><Button variant="danger" className="!min-h-9 !px-2 text-xs" onClick={() => setRm(x)}>✕</Button></div></Card></li>))}</ul>}</Async>
    <Modal open={edit !== undefined} onClose={() => setEdit(undefined)} title={edit ? "Edit transaction" : "Add transaction"}>
      {edit !== undefined && <TxnForm initial={edit} cats={cats.data?.categories ?? []} onClose={() => setEdit(undefined)} onDone={() => { setEdit(undefined); t.reload(); }} />}</Modal>
    <ConfirmDialog open={!!rm} title="Delete transaction?" text={rm ? `"${rm.description}" will be removed.` : ""} busy={act.busy} onClose={() => setRm(null)} onConfirm={async () => { if (await act.run(async () => { await del(`/api/personal-transactions/${rm.id}`); t.reload(); })) setRm(null); }} />
  </>);
}

function Recurring() {
  const rules = useApi("/api/recurring");
  const cats = useApi("/api/categories");
  const groups = useApi("/api/groups");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ target: "PERSONAL", frequency: "MONTHLY", startDate: todayStr(), endDate: "", description: "", amount: "", categoryId: "", groupId: "" });
  const grp = useApi(f.target === "GROUP" && f.groupId ? `/api/groups/${f.groupId}` : null);
  const act = useAction();
  const errs = fieldErrors(act.error);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = { target: f.target, frequency: f.frequency, startDate: f.startDate, endDate: f.endDate || null, description: f.description, amount: f.amount, categoryId: f.categoryId || null };
    if (f.target === "GROUP") { body.groupId = f.groupId; body.split = { type: "EQUAL", participants: (grp.data?.group.members ?? []).map((m) => m.id) }; }
    if (await act.run(() => post("/api/recurring", body))) { setOpen(false); rules.reload(); }
  };
  const add = <Button onClick={() => { act.clear(); setOpen(true); }}>+ New recurring</Button>;
  return (<>
    <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-muted">Created automatically on schedule, even if you never open the app.</p>{add}</div>
    <Async state={rules}>{({ rules: list }) => list.length === 0 ? <EmptyState title="No recurring expenses" text="Rent, Netflix, Spotify, hostel fees… set them once." action={add} /> :
      <ul className="space-y-2">{list.map((r) => (<li key={r.id}><Card className="!p-3">
        <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{r.description} {!r.active && <span className="text-xs text-warn">(paused)</span>}</p>
          <p className="text-xs text-muted">{r.frequency.toLowerCase()} · {r.target === "GROUP" ? "split with group" : "personal"} · next {prettyDate(r.nextRun)}</p></div><Money paise={r.amount} className="font-semibold" /></div>
        <div className="mt-2 flex gap-2"><Button variant="ghost" className="!min-h-9 text-xs" onClick={() => act.run(async () => { await patch(`/api/recurring/${r.id}`, { active: !r.active }); rules.reload(); })}>{r.active ? "Pause" : "Resume"}</Button>
          <Button variant="danger" className="!min-h-9 text-xs" onClick={() => act.run(async () => { await del(`/api/recurring/${r.id}`); rules.reload(); })}>Delete</Button></div></Card></li>))}</ul>}</Async>
    <Modal open={open} onClose={() => setOpen(false)} title="New recurring expense">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="rt" label="Type"><Select id="rt" value={f.target} onChange={set("target")}><option value="PERSONAL">Personal expense</option><option value="GROUP">Shared with a group (equal split)</option></Select></Field>
        {f.target === "GROUP" && <Field id="rg" label="Group"><Select id="rg" value={f.groupId} onChange={set("groupId")} required><option value="">Choose…</option>{(groups.data?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>}
        <Field id="rd" label="Description" error={errs.description}><Input id="rd" value={f.description} onChange={set("description")} placeholder="Rent" required /></Field>
        <Field id="ra" label="Amount (₹)" error={errs.amount}><Input id="ra" inputMode="decimal" value={f.amount} onChange={set("amount")} required /></Field>
        <Field id="rf" label="Repeats"><Select id="rf" value={f.frequency} onChange={set("frequency")}>{["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].map((x) => <option key={x} value={x}>{x[0] + x.slice(1).toLowerCase()}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3"><Field id="rs" label="Starts" error={errs.startDate}><Input id="rs" type="date" value={f.startDate} onChange={set("startDate")} required /></Field><Field id="re" label="Ends (optional)"><Input id="re" type="date" value={f.endDate} onChange={set("endDate")} /></Field></div>
        <Field id="rc" label="Category"><Select id="rc" value={f.categoryId} onChange={set("categoryId")}><option value="">Uncategorised</option>{(cats.data?.categories ?? []).filter((c) => c.kind === "EXPENSE").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        {!Object.keys(errs).length && <FormError error={act.error} />}
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" busy={act.busy}>Create</Button></div>
      </form></Modal>
  </>);
}
