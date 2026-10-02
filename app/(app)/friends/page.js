"use client";
import Link from "next/link";
import { useState } from "react";
import { useApi, useAction } from "@/hooks/useApi";
import { post, del, get } from "@/lib/api/client";
import { Async, Avatar, Button, Card, EmptyState, FormError, Input, Money, PageHeader } from "@/components/common/ui";

export default function Friends() {
  const list = useApi("/api/friends");
  const bal = useApi("/api/friends/balances");
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const act = useAction();
  const search = async (e) => { e.preventDefault(); await act.run(async () => setResults((await get(`/api/users/search?q=${encodeURIComponent(q)}`)).users)); };
  const doAct = (fn) => act.run(async () => { await fn(); list.reload(); if (results) setResults((await get(`/api/users/search?q=${encodeURIComponent(q)}`)).users); });
  const netOf = (id) => bal.data?.balances.find((b) => b.userId === id)?.net ?? 0;
  const Row = ({ u, children }) => (<li className="flex items-center justify-between gap-3 py-2"><span className="flex min-w-0 items-center gap-3"><Avatar name={u.displayName} /><span className="truncate">{u.displayName} <span className="text-xs text-muted">@{u.username}</span></span></span><span className="flex items-center gap-2">{children}</span></li>);

  return (<>
    <PageHeader title="Friends" subtitle="Split with them directly - no group needed." actions={<Link href="/expenses/new" className="btn btn-primary min-h-11 px-4 py-2 text-sm">+ Add expense</Link>} />
    <Card className="mb-4">
      <form onSubmit={search} className="flex gap-2" role="search"><Input aria-label="Search by username" placeholder="Search username…" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" /><Button type="submit" busy={act.busy}>Search</Button></form>
      <div className="mt-2"><FormError error={act.error} /></div>
      {results && (results.length === 0 ? <p className="mt-3 text-sm text-muted">No users found. Usernames must match from the start.</p> :
        <ul className="mt-3 divide-y divide-line">{results.map((u) => (<Row key={u.id} u={u}>
          {u.relation === "NONE" && <Button className="!min-h-9 text-xs" onClick={() => doAct(() => post("/api/friends/requests", { username: u.username }))}>Add friend</Button>}
          {u.relation === "REQUEST_SENT" && <span className="text-xs text-muted">Request sent</span>}
          {u.relation === "REQUEST_RECEIVED" && <Button className="!min-h-9 text-xs" onClick={() => doAct(() => post("/api/friends/requests", { username: u.username }))}>Accept</Button>}
          {u.relation === "FRIEND" && <span className="text-xs text-pos">Friends ✓</span>}</Row>))}</ul>)}
    </Card>
    <Async state={list}>{(d) => (<div className="space-y-4">
      {d.incoming.length > 0 && <Card><h2 className="mb-2 text-lg">Requests for you</h2><ul className="divide-y divide-line">{d.incoming.map((u) => (<Row key={u.id} u={u}>
        <Button className="!min-h-9 text-xs" onClick={() => doAct(() => post(`/api/friends/requests/${u.friendshipId}/accept`))}>Accept</Button>
        <Button variant="ghost" className="!min-h-9 text-xs" onClick={() => doAct(() => post(`/api/friends/requests/${u.friendshipId}/reject`))}>Reject</Button></Row>))}</ul></Card>}
      {d.outgoing.length > 0 && <Card><h2 className="mb-2 text-lg">Sent requests</h2><ul className="divide-y divide-line">{d.outgoing.map((u) => (<Row key={u.id} u={u}>
        <Button variant="ghost" className="!min-h-9 text-xs" onClick={() => doAct(() => del(`/api/friends/${u.friendshipId}`))}>Cancel</Button></Row>))}</ul></Card>}
      <Card><h2 className="mb-2 text-lg">Your friends</h2>{d.friends.length === 0 ? <EmptyState title="No friends yet" text="Search for a username above to send a request." /> :
        <ul className="divide-y divide-line">{d.friends.map((u) => { const n = netOf(u.id); return (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2">
            <Link href={`/friends/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-accent"><Avatar name={u.displayName} />
              <span className="truncate">{u.displayName} <span className="text-xs text-muted">@{u.username}</span></span></Link>
            <span className="text-right text-sm">{n === 0 ? <span className="text-muted">settled up</span> : <><span className="block text-xs text-muted">{n > 0 ? "owes you" : "you owe"}</span><Money paise={Math.abs(n)} className={n > 0 ? "font-semibold text-pos" : "font-semibold text-neg"} /></>}</span>
            <Button variant="danger" className="!min-h-9 !px-2 text-xs" aria-label={`Remove ${u.displayName}`} onClick={() => { if (confirm(`Remove ${u.displayName} from your friends?`)) doAct(() => del(`/api/friends/${u.friendshipId}`)); }}>✕</Button></li>); })}</ul>}</Card></div>)}</Async>
  </>);
}
