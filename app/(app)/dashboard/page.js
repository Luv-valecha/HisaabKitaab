"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { Async, Card, Money, PageHeader, Progress, EmptyState, prettyMonth } from "@/components/common/ui";
import Icon from "@/components/common/Icon";

const SHORTCUTS = [["/expenses/new", "Add expense", "plus"], ["/groups", "Groups", "groups"], ["/friends", "Friends", "friends"], ["/budget", "Budget", "budget"], ["/analytics", "Analytics", "chart"], ["/settlements", "Settlements", "settle"]];

export default function Dashboard() {
  const { user } = useAuth();
  const dash = useApi("/api/dashboard");
  const bal = useApi("/api/balances");
  return (
    <>
      <PageHeader title={`Hello, ${user.displayName}`} subtitle="Here's where you stand." />
      <Async state={dash}>{(d) => (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="col-span-2 lg:col-span-1"><p className="text-sm text-muted">Total balance</p><p className="mt-1 text-3xl font-bold"><Money paise={d.net} signed /></p></Card>
          <Card><p className="text-sm text-muted">You owe</p><p className="mt-1 text-2xl font-bold text-neg"><Money paise={d.owe} /></p></Card>
          <Card><p className="text-sm text-muted">You are owed</p><p className="mt-1 text-2xl font-bold text-pos"><Money paise={d.owed} /></p></Card>
          <Card className="col-span-2 lg:col-span-1"><p className="text-sm text-muted">{prettyMonth(d.month)} spending</p><p className="mt-1 text-2xl font-bold"><Money paise={d.monthSpending} /></p>
            <p className="mt-0.5 text-xs text-muted">Your own share only</p></Card>
          <Card className="col-span-2 lg:col-span-4">
            <div className="flex items-baseline justify-between"><p className="text-sm text-muted">Budget remaining</p>
              {d.budgetRemaining !== null && <span className="text-xs text-muted">{d.budgetPercentUsed}% used</span>}</div>
            {d.budgetRemaining === null ? <p className="mt-2 text-sm text-muted">No budget set for this month. <Link href="/budget" className="text-accent underline">Set one</Link></p>
              : <><p className="mt-1 text-2xl font-bold"><Money paise={d.budgetRemaining} signed={d.budgetRemaining < 0} /></p><div className="mt-3"><Progress percent={d.budgetPercentUsed} label="Budget used" /></div></>}
          </Card>
        </div>)}</Async>

      <nav aria-label="Shortcuts" className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SHORTCUTS.map(([href, label, icon]) => (
          <Link key={href} href={href} className="card flex min-h-24 flex-col items-center justify-center gap-2 p-3 text-center text-sm font-medium hover:border-accent"><span className="text-accent"><Icon name={icon} size={26} /></span>{label}</Link>
        ))}
      </nav>

      <Async state={bal}>{(b) => b.friends.length > 0 && (<>
        <h2 className="mb-3 mt-8 text-xl">Balances with friends</h2>
        <div className="grid gap-3 sm:grid-cols-2">{b.friends.map((f) => (
          <Link key={f.userId} href={`/friends/${f.userId}`} className="card flex items-center justify-between p-4 hover:border-accent">
            <span className="font-medium">{f.name}</span>
            <span className="text-right text-sm"><span className="block text-xs text-muted">{f.net > 0 ? "owes you" : "you owe"}</span><Money paise={Math.abs(f.net)} className={f.net > 0 ? "text-pos font-semibold" : "text-neg font-semibold"} /></span>
          </Link>))}</div></>)}</Async>

      <h2 className="mb-3 mt-8 text-xl">Balances by group</h2>
      <Async state={bal}>{(b) => b.groups.length === 0
        ? <EmptyState title="No groups yet" text="Create a group for recurring crowds - or just split with friends directly." action={<Link href="/groups" className="btn btn-primary mt-2 px-4 py-2 text-sm">Create a group</Link>} />
        : <div className="grid gap-3 sm:grid-cols-2">{b.groups.map((g) => (
            <Link key={g.groupId} href={`/groups/${g.groupId}`} className="card flex items-center justify-between p-4 hover:border-accent">
              <span className="font-medium">{g.name}</span>
              <span className="text-right text-sm">{g.net === 0 ? <span className="text-muted">Settled up</span> : <><span className="block text-xs text-muted">{g.net > 0 ? "you are owed" : "you owe"}</span><Money paise={Math.abs(g.net)} className={g.net > 0 ? "text-pos font-semibold" : "text-neg font-semibold"} /></>}</span>
            </Link>))}</div>}</Async>
    </>
  );
}
