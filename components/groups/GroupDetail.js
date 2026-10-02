"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi, useAction } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { post, del } from "@/lib/api/client";
import { paiseToRupees } from "@/lib/calculations/money";
import { Async, Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, FormError, Input, Modal, Money, PageHeader, Select, Tabs, prettyDate } from "@/components/common/ui";

export default function GroupDetail({ id }) {
  const { user } = useAuth();
  const router = useRouter();
  const group = useApi(`/api/groups/${id}`);
  const expenses = useApi(`/api/groups/${id}/expenses`);
  const balances = useApi(`/api/groups/${id}/balances`);
  const history = useApi(`/api/groups/${id}/settlements`);
  const friends = useApi("/api/friends");
  const [tab, setTab] = useState("expenses");
  const [confirm, setConfirm] = useState(null); // {title,text,label,fn}
  const [payOpen, setPayOpen] = useState(false);
  const act = useAction();
  const refreshMoney = () => { expenses.reload(); balances.reload(); history.reload(); };
  const doConfirm = async () => { if (await act.run(confirm.fn)) setConfirm(null); };

  return (
    <Async state={group}>{({ group: g }) => {
      const isOwner = g.myRole === "OWNER";
      const memberIds = new Set(g.members.map((m) => m.id));
      const addable = (friends.data?.friends ?? []).filter((f) => !memberIds.has(f.id));
      return (<>
        <PageHeader title={g.name} subtitle={g.description || `${g.members.length} members`}
          actions={<><Link href={`/expenses/new?group=${id}`} className="btn btn-primary min-h-11 px-4 py-2 text-sm">+ Add expense</Link>
            <Button variant="ghost" onClick={() => setTab("settle")}>Settle up</Button></>} />
        <Tabs value={tab} onChange={setTab} tabs={[["expenses", "Expenses"], ["balances", "Balances"], ["settle", "Settle up"], ["history", "History"], ["members", "Members"]]} />

        {tab === "expenses" && <Async state={expenses}>{({ expenses: list }) => list.length === 0
          ? <EmptyState title="No expenses yet" text="Add the first one to start tracking." action={<Link href={`/expenses/new?group=${id}`} className="btn btn-primary mt-2 px-4 py-2 text-sm">Add expense</Link>} />
          : <ul className="space-y-2">{list.map((e) => {
              const mine = e.splits.find((s) => s.userId === user.id);
              const canEdit = isOwner || e.createdBy === user.id || e.paidBy.id === user.id;
              return (
                <li key={e.id}><Card className="!p-3 sm:!p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-semibold">{e.description}</p>
                      <p className="text-xs text-muted">{prettyDate(e.date)} · {e.category?.name ?? "Uncategorised"} · paid by {e.paidBy.id === user.id ? "you" : e.paidBy.name}</p></div>
                    <div className="text-right"><Money paise={e.amount} className="font-semibold" />
                      <p className="text-xs text-muted">{mine ? <>your share <Money paise={mine.owed} /></> : "not involved"}</p></div>
                  </div>
                  {canEdit && <div className="mt-2 flex gap-2">
                    <Link href={`/expenses/${e.id}/edit`} className="btn btn-ghost min-h-9 px-3 py-1 text-xs">Edit</Link>
                    <Button variant="danger" className="!min-h-9 !px-3 !py-1 text-xs" onClick={() => setConfirm({ title: "Delete expense?", text: `"${e.description}" will be removed and balances recalculated.`, label: "Delete", fn: async () => { await del(`/api/expenses/${e.id}`); refreshMoney(); } })}>Delete</Button></div>}
                </Card></li>);})}</ul>}</Async>}

        {tab === "balances" && <Async state={balances}>{(b) => (<div className="space-y-4">
          <Card><h3 className="mb-3 text-lg">Net balances</h3><ul className="divide-y divide-line">{b.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2"><span className="flex items-center gap-2"><Avatar name={m.name} size={28} />{m.id === user.id ? "You" : m.name}</span>
              <span className="text-sm">{m.net === 0 ? <span className="text-muted">settled</span> : <><span className="mr-2 text-xs text-muted">{m.net > 0 ? "is owed" : "owes"}</span><Money paise={Math.abs(m.net)} className={m.net > 0 ? "font-semibold text-pos" : "font-semibold text-neg"} /></>}</span></li>))}</ul></Card>
          <Card><h3 className="mb-3 text-lg">Who owes whom</h3>
            {b.pairwise.length === 0 ? <p className="text-sm text-muted">Everyone is settled up. 🎉</p> : <ul className="space-y-2 text-sm">{b.pairwise.map((p, i) => (
              <li key={i}>{p.from.id === user.id ? "You" : p.from.name} owe{p.from.id === user.id ? "" : "s"} {p.to.id === user.id ? "you" : p.to.name} <Money paise={p.amount} className="font-semibold" /></li>))}</ul>}</Card></div>)}</Async>}

        {tab === "settle" && <Async state={balances}>{(b) => (<Card>
          <div className="mb-3 flex items-center justify-between"><h3 className="text-lg">Suggested settlements</h3><Button variant="ghost" onClick={() => setPayOpen(true)}>Record a payment</Button></div>
          <p className="mb-3 text-sm text-muted">The fewest payments that settle everyone up.</p>
          {b.suggestions.length === 0 ? <p className="text-sm">Nothing to settle. 🎉</p> : <ul className="space-y-3">{b.suggestions.map((s, i) => {
            const involved = s.from.id === user.id || s.to.id === user.id;
            return (<li key={i} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{s.from.id === user.id ? <b>Pay {s.to.name}</b> : s.to.id === user.id ? <b>Receive from {s.from.name}</b> : <>{s.from.name} pays {s.to.name}</>} <Money paise={s.amount} className="font-semibold" /></span>
              {involved && <Button className="!min-h-9 text-xs" busy={act.busy} onClick={() => act.run(async () => { await post(`/api/groups/${id}/settlements`, { fromUser: s.from.id, toUser: s.to.id, amount: paiseToRupees(s.amount) }); refreshMoney(); })}>{s.from.id === user.id ? "Mark as paid" : "Mark as received"}</Button>}</li>);})}</ul>}
          <div className="mt-3"><FormError error={act.error} /></div></Card>)}</Async>}

        {tab === "history" && <Async state={history}>{({ settlements: list }) => list.length === 0
          ? <EmptyState title="No settlements yet" text="Payments you record show up here permanently." />
          : <ul className="space-y-2">{list.map((s) => (<li key={s.id}><Card className="!p-3 flex items-center justify-between gap-3">
              <div><p className="text-sm">{s.from.id === user.id ? "You" : s.from.name} paid {s.to.id === user.id ? "you" : s.to.name}</p><p className="text-xs text-muted">{prettyDate(s.settledAt.slice(0, 10))}{s.note ? ` · ${s.note}` : ""}</p></div>
              <Money paise={s.amount} className="font-semibold" /></Card></li>))}</ul>}</Async>}

        {tab === "members" && <div className="space-y-4">
          <Card><h3 className="mb-3 text-lg">Members</h3><ul className="divide-y divide-line">{g.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2"><span className="flex items-center gap-2"><Avatar name={m.displayName} size={32} /><span>{m.displayName} <span className="text-xs text-muted">@{m.username}{m.role === "OWNER" ? " · owner" : ""}</span></span></span>
              {m.role !== "OWNER" && (isOwner || m.id === user.id) && <Button variant="danger" className="!min-h-9 !px-3 text-xs" onClick={() => setConfirm({ title: m.id === user.id ? "Leave group?" : `Remove ${m.displayName}?`, text: "Their balance must be settled first.", label: m.id === user.id ? "Leave" : "Remove",
                fn: async () => { await del(`/api/groups/${id}/members/${m.id}`); if (m.id === user.id) router.push("/groups"); else { group.reload(); balances.reload(); } } })}>{m.id === user.id ? "Leave" : "Remove"}</Button>}</li>))}</ul></Card>
          <Card><h3 className="mb-3 text-lg">Add a friend</h3>{addable.length === 0 ? <p className="text-sm text-muted">All your friends are already here. <Link href="/friends" className="text-accent underline">Find more friends</Link></p> :
            <ul className="space-y-2">{addable.map((f) => (<li key={f.id} className="flex items-center justify-between gap-3"><span>{f.displayName} <span className="text-xs text-muted">@{f.username}</span></span>
              <Button className="!min-h-9 text-xs" onClick={() => act.run(async () => { await post(`/api/groups/${id}/members`, { userId: f.id }); group.reload(); balances.reload(); })}>Add</Button></li>))}</ul>}
            <div className="mt-3"><FormError error={act.error} /></div></Card>
          {isOwner && <Button variant="danger" onClick={() => setConfirm({ title: "Delete this group?", text: "All its expenses and settlements will be permanently deleted for everyone.", label: "Delete group", fn: async () => { await del(`/api/groups/${id}`); router.push("/groups"); } })}>Delete group</Button>}
        </div>}

        <ConfirmDialog open={!!confirm} title={confirm?.title} text={confirm?.text} confirmLabel={confirm?.label} busy={act.busy} onConfirm={doConfirm} onClose={() => setConfirm(null)} />
        {confirm && act.error && <div className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md"><FormError error={act.error} /></div>}
        <PayModal open={payOpen} onClose={() => setPayOpen(false)} members={g.members} me={user.id} groupId={id} onDone={() => { setPayOpen(false); refreshMoney(); }} />
      </>);
    }}</Async>
  );
}

function PayModal({ open, onClose, members, me, groupId, onDone }) {
  const [f, setF] = useState({ fromUser: me, toUser: "", amount: "", note: "" });
  const { run, busy, error } = useAction();
  const submit = async (e) => { e.preventDefault(); if (await run(() => post(`/api/groups/${groupId}/settlements`, { ...f, note: f.note || null }))) onDone(); };
  return (
    <Modal open={open} onClose={onClose} title="Record a payment">
      <form onSubmit={submit} className="space-y-4">
        <Field id="pf" label="Who paid?"><Select id="pf" value={f.fromUser} onChange={(e) => setF({ ...f, fromUser: e.target.value })}>{members.map((m) => <option key={m.id} value={m.id}>{m.id === me ? "You" : m.displayName}</option>)}</Select></Field>
        <Field id="pt" label="Paid to"><Select id="pt" value={f.toUser} onChange={(e) => setF({ ...f, toUser: e.target.value })} required><option value="">Choose…</option>{members.filter((m) => m.id !== f.fromUser).map((m) => <option key={m.id} value={m.id}>{m.id === me ? "You" : m.displayName}</option>)}</Select></Field>
        <Field id="pa" label="Amount (₹)"><Input id="pa" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
        <Field id="pn" label="Note (optional)"><Input id="pn" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="UPI, cash…" /></Field>
        <FormError error={error} />
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>Record</Button></div>
      </form>
    </Modal>
  );
}
