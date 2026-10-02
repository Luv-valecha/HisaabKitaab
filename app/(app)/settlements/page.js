"use client";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { Async, Card, EmptyState, Money, PageHeader, prettyDate } from "@/components/common/ui";

export default function Settlements() {
  const { user } = useAuth();
  const s = useApi("/api/settlements");
  return (<>
    <PageHeader title="Settlement history" subtitle="Every payment you've made or received, across all groups." />
    <Async state={s}>{({ settlements: list }) => list.length === 0
      ? <EmptyState title="Nothing settled yet" text="Open a group's Settle up tab to record a payment." action={<Link href="/groups" className="btn btn-primary mt-2 px-4 py-2 text-sm">Go to groups</Link>} />
      : <ul className="space-y-2">{list.map((x) => {
          const out = x.from.id === user.id;
          return (<li key={x.id}><Card className="!p-3 flex items-center justify-between gap-3">
            <div><p className="text-sm">{out ? <>You paid <b>{x.to.name}</b></> : <><b>{x.from.name}</b> paid you</>}</p>
              <p className="text-xs text-muted">{prettyDate(x.settledAt.slice(0, 10))} · {x.groupName}{x.note ? ` · ${x.note}` : ""}</p></div>
            <Money paise={out ? -x.amount : x.amount} signed className="font-semibold" /></Card></li>);})}</ul>}</Async>
  </>);
}
