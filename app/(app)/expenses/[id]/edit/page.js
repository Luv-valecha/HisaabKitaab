"use client";
import { use } from "react";
import { useApi } from "@/hooks/useApi";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { Async, PageHeader } from "@/components/common/ui";

export default function EditExpense({ params }) {
  const { id } = use(params);
  const e = useApi(`/api/expenses/${id}`);
  return <><PageHeader title="Edit expense" /><Async state={e}>{(d) => <ExpenseForm initial={d.expense} />}</Async></>;
}
