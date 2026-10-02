"use client";
import { useEffect, useRef } from "react";
import { formatINR } from "@/lib/calculations/money";
import ThemeLoader from "@/components/themes/ThemeLoader";
import EmptyArt from "@/components/themes/EmptyArt";

export function Button({ variant = "primary", className = "", busy, children, ...rest }) {
  return <button className={`btn btn-${variant} min-h-11 px-4 py-2 text-sm ${className}`} disabled={busy || rest.disabled} {...rest}>{busy ? "Working…" : children}</button>;
}
export const Card = ({ className = "", children, ...r }) => <section className={`card p-4 sm:p-5 ${className}`} {...r}>{children}</section>;

export function Field({ label, error, hint, children, id }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs text-neg">{error}</p>}
    </div>
  );
}
export const Input = ({ error, ...p }) => <input className="input" aria-invalid={!!error} {...p} />;
export const Select = ({ children, ...p }) => <select className="input" {...p}>{children}</select>;

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function ErrorState({ error, onRetry }) {
  return (
    <Card role="alert" className="text-center">
      <p className="font-semibold text-neg">{error?.message ?? "Something went wrong"}</p>
      {onRetry && <Button variant="ghost" className="mt-3" onClick={onRetry}>Try again</Button>}
    </Card>
  );
}
export function EmptyState({ title, text, action }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <EmptyArt /><h3 className="text-lg">{title}</h3>{text && <p className="max-w-sm text-sm text-muted">{text}</p>}{action}
    </Card>
  );
}
/** Standard loading / error gate for data-backed sections. */
export function Async({ state, children }) {
  if (state.loading && !state.data) return <ThemeLoader />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  return state.data ? children(state.data) : null;
}
export function FormError({ error }) {
  if (!error) return null;
  return <p role="alert" className="rounded-[var(--radius-sm)] border border-neg px-3 py-2 text-sm text-neg">{error.message}</p>;
}

/** Signed money: positive = good (pos colour), negative = bad (neg colour). */
export function Money({ paise, signed = false, className = "" }) {
  const cls = signed ? (paise > 0 ? "text-pos" : paise < 0 ? "text-neg" : "text-muted") : "";
  return <span className={`tabular-nums ${cls} ${className}`}>{signed && paise > 0 ? "+" : ""}{formatINR(paise)}</span>;
}
export const Avatar = ({ name, size = 36 }) => (
  <span aria-hidden="true" style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">
    {(name ?? "?").slice(0, 1).toUpperCase()}
  </span>
);

export function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector("input,select,textarea,button")?.focus();
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="card max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-[var(--radius)]">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="btn btn-ghost h-10 w-10">✕</button></div>
        {children}
      </div>
    </div>
  );
}
export function ConfirmDialog({ open, title, text, confirmLabel = "Delete", onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-muted">{text}</p>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" busy={busy} onClick={onConfirm}>{confirmLabel}</Button></div>
    </Modal>
  );
}
export function Progress({ percent, label }) {
  const p = Math.max(0, Math.min(100, percent ?? 0));
  const color = (percent ?? 0) >= 100 ? "var(--neg)" : (percent ?? 0) >= 80 ? "var(--warn)" : "var(--pos)";
  return <div role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${p}%`, background: color }} /></div>;
}
export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-[var(--radius-sm)] bg-surface p-1">
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={`btn min-h-10 shrink-0 px-3 text-sm ${value === id ? "btn-primary" : "text-muted hover:text-ink"}`}>{label}</button>
      ))}
    </div>
  );
}
export const monthNow = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
export const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const prettyDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const prettyMonth = (m) => new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
export function MonthPicker({ value, onChange }) {
  return <input type="month" aria-label="Month" className="input !w-auto" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />;
}
