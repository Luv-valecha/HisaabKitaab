"use client";
import { useApi, useAction } from "@/hooks/useApi";
import { post } from "@/lib/api/client";
import { Async, Button, Card, EmptyState, PageHeader } from "@/components/common/ui";

export default function Notifications() {
  const n = useApi("/api/notifications");
  const act = useAction();
  return (<>
    <PageHeader title="Notifications" actions={<Button variant="ghost" busy={act.busy} onClick={() => act.run(async () => { await post("/api/notifications/read-all"); n.reload(); })}>Mark all read</Button>} />
    <Async state={n}>{({ notifications }) => notifications.length === 0
      ? <EmptyState title="All quiet" text="Expense, settlement and budget alerts will appear here." />
      : <ul className="space-y-2">{notifications.map((x) => (<li key={x.id}><Card className={`!p-3 ${x.read ? "opacity-70" : "border-accent"}`}>
          <p className="text-sm">{!x.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" aria-label="unread" />}{x.message}</p>
          <p className="mt-1 text-xs text-muted">{new Date(x.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></Card></li>))}</ul>}</Async>
  </>);
}
