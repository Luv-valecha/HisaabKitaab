"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fieldErrors } from "@/lib/api/client";
import { useAction } from "@/hooks/useApi";
import { Button, Card, Field, FormError, Input } from "./ui";

export default function AuthForm({ mode }) {
  const isReg = mode === "register";
  const { user, login, register } = useAuth();
  const router = useRouter();
  const { run, busy, error } = useAction();
  const [f, setF] = useState({ identifier: "", username: "", email: "", displayName: "", password: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const errs = fieldErrors(error);

  useEffect(() => { if (user) router.replace("/dashboard"); }, [user, router]);

  const submit = async (e) => {
    e.preventDefault();
    await run(() => (isReg ? register({ username: f.username, email: f.email, displayName: f.displayName, password: f.password }) : login(f.identifier, f.password)));
  };
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="font-display mb-1 text-3xl text-accent">HisaabKitaab</h1>
        <p className="mb-5 text-sm text-muted">{isReg ? "Create your account" : "Welcome back"}</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {isReg ? (<>
            <Field id="u" label="Username" error={errs.username} hint="Friends find you by this. Letters, numbers, underscore."><Input id="u" value={f.username} onChange={set("username")} autoComplete="username" autoCapitalize="none" required /></Field>
            <Field id="n" label="Display name" error={errs.displayName}><Input id="n" value={f.displayName} onChange={set("displayName")} autoComplete="name" required /></Field>
            <Field id="e" label="Email" error={errs.email}><Input id="e" type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></Field>
          </>) : (
            <Field id="i" label="Username or email"><Input id="i" value={f.identifier} onChange={set("identifier")} autoComplete="username" autoCapitalize="none" required /></Field>
          )}
          <Field id="p" label="Password" error={errs.password} hint={isReg ? "At least 8 characters" : undefined}>
            <Input id="p" type="password" value={f.password} onChange={set("password")} autoComplete={isReg ? "new-password" : "current-password"} required /></Field>
          {!Object.keys(errs).length && <FormError error={error} />}
          <Button type="submit" busy={busy} className="w-full">{isReg ? "Create account" : "Log in"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          {isReg ? <>Have an account? <Link className="text-accent underline" href="/login">Log in</Link></> : <>New here? <Link className="text-accent underline" href="/register">Create an account</Link></>}
        </p>
      </Card>
    </main>
  );
}
