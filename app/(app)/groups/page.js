"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi, useAction } from "@/hooks/useApi";
import { post, fieldErrors } from "@/lib/api/client";
import { Async, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader } from "@/components/common/ui";

export default function Groups() {
  const groups = useApi("/api/groups");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", description: "" });
  const { run, busy, error, clear } = useAction();
  const router = useRouter();
  const errs = fieldErrors(error);
  const create = async (e) => {
    e.preventDefault();
    let id;
    if (await run(async () => { id = (await post("/api/groups", f)).group.id; })) router.push(`/groups/${id}`);
  };
  const newBtn = <Button onClick={() => { clear(); setOpen(true); }}>+ New group</Button>;
  return (
    <>
      <PageHeader title="Groups" subtitle="Trips, flats, offices - anywhere money is shared." actions={newBtn} />
      <Async state={groups}>{({ groups: list }) => list.length === 0
        ? <EmptyState title="No groups yet" text="Create one, then add your friends." action={newBtn} />
        : <div className="grid gap-3 sm:grid-cols-2">{list.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="card block p-4 hover:border-accent">
              <h3 className="text-lg">{g.name}</h3>{g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
              <p className="mt-3 text-xs text-muted">{g.memberCount} member{g.memberCount === 1 ? "" : "s"}</p></Link>))}</div>}</Async>
      <Modal open={open} onClose={() => setOpen(false)} title="New group">
        <form onSubmit={create} className="space-y-4" noValidate>
          <Field id="gn" label="Group name" error={errs.name}><Input id="gn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Goa Trip" required /></Field>
          <Field id="gd" label="Description (optional)" error={errs.description}><Input id="gd" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          {!Object.keys(errs).length && <FormError error={error} />}
          <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" busy={busy}>Create</Button></div>
        </form>
      </Modal>
    </>
  );
}
