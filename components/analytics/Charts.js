"use client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { formatINR } from "@/lib/calculations/money";
import { usePalette } from "@/hooks/usePalette";

const inr = (v) => formatINR(v);
const compact = (v) => (Math.abs(v) >= 100000 ? `${v / 10000000 >= 1 ? (v / 10000000).toFixed(1) + "Cr" : (v / 10000000).toFixed(2)}`.replace(/^0\./, ".") : `₹${Math.round(v / 100)}`);
const shortMonth = (m) => new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short" });

function Frame({ height = 260, empty, label, children }) {
  if (empty) return <p className="grid place-items-center py-10 text-sm text-muted" style={{ minHeight: height / 2 }}>No data for this period yet.</p>;
  return <div role="img" aria-label={label} style={{ width: "100%", height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}
const tip = (p) => ({ contentStyle: { background: p.line ? "var(--card)" : "#fff", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)" }, formatter: inr, labelStyle: { color: "var(--muted)" } });

export function DonutChart({ data, label }) {
  const p = usePalette();
  return (<Frame empty={!data.length} label={label} height={280}>
    <PieChart><Pie data={data} dataKey="total" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
      {data.map((_, i) => <Cell key={i} fill={p.series[i % p.series.length]} />)}</Pie>
      <Tooltip {...tip(p)} /><Legend wrapperStyle={{ fontSize: 12, color: p.muted }} /></PieChart></Frame>);
}
export function TrendChart({ data, label }) {
  const p = usePalette();
  const d = data.map((x) => ({ ...x, m: shortMonth(x.month) }));
  return (<Frame empty={!data.some((x) => x.total)} label={label}>
    <LineChart data={d} margin={{ left: 0, right: 12, top: 8 }}><CartesianGrid stroke={p.line} strokeDasharray="3 3" /><XAxis dataKey="m" stroke={p.muted} fontSize={12} />
      <YAxis stroke={p.muted} fontSize={12} width={52} tickFormatter={(v) => `₹${Math.round(v / 100)}`} /><Tooltip {...tip(p)} />
      <Line type="monotone" dataKey="total" name="Spent" stroke={p.accent} strokeWidth={3} dot={{ r: 4, fill: p.accent }} /></LineChart></Frame>);
}
export function BarsChart({ data, keys, xKey = "name", label }) {
  const p = usePalette();
  return (<Frame empty={!data.length} label={label}>
    <BarChart data={data} margin={{ left: 0, right: 12, top: 8 }}><CartesianGrid stroke={p.line} strokeDasharray="3 3" vertical={false} /><XAxis dataKey={xKey} stroke={p.muted} fontSize={12} interval={0} />
      <YAxis stroke={p.muted} fontSize={12} width={52} tickFormatter={(v) => `₹${Math.round(v / 100)}`} /><Tooltip {...tip(p)} /><Legend wrapperStyle={{ fontSize: 12, color: p.muted }} />
      {keys.map(([k, name], i) => <Bar key={k} dataKey={k} name={name} fill={[p.accent, p.accent2, p.warn][i % 3]} radius={[4, 4, 0, 0]} />)}</BarChart></Frame>);
}
