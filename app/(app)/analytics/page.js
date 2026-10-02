"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Async, Card, EmptyState, Money, MonthPicker, PageHeader, Tabs, monthNow, prettyDate, prettyMonth } from "@/components/common/ui";
import { BarsChart, DonutChart, TrendChart } from "@/components/analytics/Charts";

const Stat = ({ label, children, sub }) => (<Card><p className="text-sm text-muted">{label}</p><p className="mt-1 text-xl font-bold sm:text-2xl">{children}</p>{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}</Card>);

export default function Analytics() {
  const [tab, setTab] = useState("personal");
  const [month, setMonth] = useState(monthNow());
  return (<>
    <PageHeader title="Analytics" actions={<MonthPicker value={month} onChange={setMonth} />} />
    <Tabs value={tab} onChange={setTab} tabs={[["personal", "Personal"], ["shared", "Shared expenses"]]} />
    {tab === "personal" ? <Personal month={month} /> : <Shared month={month} />}
  </>);
}

function Personal({ month }) {
  const a = useApi(`/api/analytics/personal?month=${month}`);
  return (<Async state={a}>{(d) => {
    const mom = d.monthOverMonth;
    return (<div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`${prettyMonth(d.month)} spending`}><Money paise={d.totalSpent} /></Stat>
        <Stat label="Average per day"><Money paise={d.averageDaily} /></Stat>
        <Stat label="Top category">{d.highestCategory ? d.highestCategory.name : "-"}</Stat>
        <Stat label="vs last month" sub={mom.percentChange === null ? "no data last month" : undefined}>{mom.percentChange === null ? "-" : <span className={mom.change > 0 ? "text-neg" : "text-pos"}>{mom.change > 0 ? "▲" : "▼"} {Math.abs(mom.percentChange)}%</span>}</Stat>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-2 text-lg">Spending by category</h2><DonutChart data={d.byCategory} label="Spending by category" /></Card>
        <Card><h2 className="mb-2 text-lg">Last 6 months</h2><TrendChart data={d.trend} label="Monthly spending trend" /></Card>
        <Card><h2 className="mb-2 text-lg">Budget vs actual</h2>{d.budgetVsActual.length === 0 ? <p className="py-8 text-center text-sm text-muted">Set budgets on the Budget page to compare.</p> : <BarsChart data={d.budgetVsActual} keys={[["limit", "Budget"], ["spent", "Spent"]]} xKey="category" label="Budget versus actual by category" />}</Card>
        <Card><h2 className="mb-2 text-lg">Income vs expenses</h2><BarsChart data={[{ name: prettyMonth(d.month), income: d.incomeVsExpenses.income, expenses: d.incomeVsExpenses.expenses }]} keys={[["income", "Income"], ["expenses", "Expenses"]]} label="Income versus expenses" />
          <p className="mt-2 text-sm text-muted">Savings: <Money paise={d.incomeVsExpenses.savings} signed /></p></Card>
      </div>
      <Card><h2 className="mb-3 text-lg">Largest expenses</h2>{d.largestExpenses.length === 0 ? <p className="text-sm text-muted">Nothing this month.</p> :
        <ul className="divide-y divide-line">{d.largestExpenses.map((x) => (<li key={x.source + x.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="truncate">{x.description}</p><p className="text-xs text-muted">{prettyDate(x.date)} · {x.category} · {x.source === "GROUP" ? "your share of a shared bill" : "personal"}</p></div><Money paise={x.amount} className="font-semibold" /></li>))}</ul>}</Card>
    </div>);
  }}</Async>);
}

function Shared({ month }) {
  const a = useApi(`/api/analytics/shared?month=${month}`);
  return (<Async state={a}>{(d) => (<div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Paid for others" sub="cash fronted beyond your share"><Money paise={d.amountPaidForOthers} /></Stat>
      <Stat label="Owed to you"><span className="text-pos"><Money paise={d.owedToMe} /></span></Stat>
      <Stat label="You owe"><span className="text-neg"><Money paise={d.iOwe} /></span></Stat>
      <Stat label="Settled so far" sub={`received ₹${Math.round(d.settlements.received / 100)}`}><Money paise={d.settlements.paid} /> <span className="text-sm font-normal text-muted">paid</span></Stat>
    </div>
    {d.groupSpending.length === 0 ? <EmptyState title="No group activity" text="Join or create a group to see shared analytics." /> : <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="mb-2 text-lg">Group spending, {prettyMonth(d.month)}</h2><BarsChart data={d.groupSpending} keys={[["total", "Total"]]} label="Spending by group" /></Card>
      <Card><h2 className="mb-2 text-lg">Group spending over time</h2><TrendChart data={d.groupSpendingOverTime} label="Group spending over time" /></Card>
      <Card className="lg:col-span-2"><h2 className="mb-2 text-lg">Group spending by category</h2><DonutChart data={d.categoryBreakdown} label="Group spending by category" /></Card></div>}
  </div>)}</Async>);
}
