"use client";
import Link from "next/link";
import { use, useState } from "react";
import { useApi, useAction } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { post, del } from "@/lib/api/client";
import { paiseToRupees } from "@/lib/calculations/money";
import { Async, Avatar, Button, Card, ConfirmDialog, EmptyState, Field, FormError, Input, Modal, Money, PageHeader, Select, prettyDate } from "@/components/common/ui";

export default function FriendLedger({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const l = useApi(`/api/friends/ledger/${id}`);
  const [payOpen, setPayOpen] = useState(false);
  const [rm, setRm] = useState(null);
  const act = useAction();

  return (
    <Async state={l}>{(d) => {
      const name = d.friend.displayName;
      return (<>
        <PageHeader title={name} subtitle={`@${d.friend.username}`}
          actions={<><Link href={`/expenses/new?friend=${id}`} className="btn btn-primary min-h-11 px-4 py-2 text-sm">+ Add expense</Link>
            <Button variant="ghost" onClick={() => setPayOpen(true)}>Settle up</Button></>} />

        <Card className="mb-4 flex items-center gap-4"><Avatar name={name} size={48} />
          <div>{d.net === 0 ? <p className="text-lg font-semibold">All settled up 🎉</p> : d.net > 0
            ? <p className="text-lg"><b>{name}</b> owes you <Money paise={d.net} className="font-bold text-pos" /></p>
            : <p className="text-lg">You owe <b>{name}</b> <Money paise={-d.net} className="font-bold text-neg" /></p>}
            <p className="text-xs text-muted">Counts only expenses shared directly between you two (not group expenses).</p></div></Card>

        <h2 className="mb-2 text-xl">Shared expenses</h2>
        {d.expenses.length === 0 ? <EmptyState title="Nothing shared yet" text="Add an expense to split with this friend." action={<Link href={`/expenses/new?friend=${id}`} className="btn btn-primary mt-2 px-4 py-2 text-sm">Add expense</Link>} /> :
          <ul className="space-y-2">{d.expenses.map((e) => {
            const mine = e.splits.find((s) => s.userId === user.id)?.owed ?? 0;
            const theirs = e.splits.find((s) => s.userId === id)?.owed ?? 0;
            const iPaid = e.paidBy.id === user.id;
            return (<li key={e.id}><Card className="!p-3 sm:!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-semibold">{e.description}</p>
                  <p className="text-xs text-muted">{prettyDate(e.date)} · {e.category?.name ?? "Uncategorised"} · paid by {iPaid ? "you" : e.paidBy.name} · total <Money paise={e.amount} /></p></div>
                <div className="text-right text-sm">{iPaid ? <><span className="block text-xs text-muted">{name} owes you</span><Money paise={theirs} className="font-semibold text-pos" /></>
                  : <><span className="block text-xs text-muted">you owe</span><Money paise={mine} className="font-semibold text-neg" /></>}</div></div>
              {(e.createdBy === user.id || iPaid) && <div className="mt-2 flex gap-2">
                <Link href={`/expenses/${e.id}/edit`} className="btn btn-ghost min-h-9 px-3 py-1 text-xs">Edit</Link>
                <Button variant="danger" className="!min-h-9 !px-3 !py-1 text-xs" onClick={() => setRm(e)}>Delete</Button></div>}
            </Card></li>);})}</ul>}

        <h2 className="mb-2 mt-6 text-xl">Payments</h2>
        {d.settlements.length === 0 ? <p className="text-sm text-muted">No payments recorded yet.</p> :
          <ul className="space-y-2">{d.settlements.map((s) => (<li key={s.id}><Card className="!p-3 flex items-center justify-between gap-3">
            <div><p className="text-sm">{s.from.id === user.id ? "You" : s.from.name} paid {s.to.id === user.id ? "you" : s.to.name}</p><p className="text-xs text-muted">{prettyDate(s.settledAt.slice(0, 10))}{s.note ? ` · ${s.note}` : ""}</p></div>
            <Money paise={s.amount} className="font-semibold" /></Card></li>))}</ul>}

        <PayModal open={payOpen} onClose={() => setPayOpen(false)} me={user} friend={d.friend} net={d.net} onDone={() => { setPayOpen(false); l.reload(); }} />
        <ConfirmDialog open={!!rm} title="Delete expense?" text={rm ? `"${rm.description}" will be removed and your balance recalculated.` : ""} busy={act.busy} onClose={() => setRm(null)}
          onConfirm={async () => { if (await act.run(async () => { await del(`/api/expenses/${rm.id}`); l.reload(); })) setRm(null); }} />
      </>);
    }}</Async>
  );
}

function PayModal({ open, onClose, me, friend, net, onDone }) {
  // Default: whoever owes pays the outstanding amount.
  const [payer, setPayer] = useState(net > 0 ? friend.id : me.id);
  const [amount, setAmount] = useState(net !== 0 ? paiseToRupees(Math.abs(net)) : "");
  const [note, setNote] = useState("");
  const { run, busy, error } = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const fromUser = payer, toUser = payer === me.id ? friend.id : me.id;
    if (await run(() => post("/api/friends/settlements", { fromUser, toUser, amount, note: note || null }))) onDone();
  };
  return (
    <Modal open={open} onClose={onClose} title="Settle up">
      <form onSubmit={submit} className="space-y-4">
        <Field id="sp" label="Who paid?"><Select id="sp" value={payer} onChange={(e) => setPayer(e.target.value)}><option value={me.id}>You paid {friend.displayName}</option><option value={friend.id}>{friend.displayName} paid you</option></Select></Field>
        <Field id="sa" label="Amount (₹)"><Input id="sa" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <Field id="sn" label="Note (optional)"><Input id="sn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI, cash…" /></Field>
        <FormError error={error} />
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" busy={busy}>Record payment</Button></div>
      </form>
    </Modal>
  );
}
