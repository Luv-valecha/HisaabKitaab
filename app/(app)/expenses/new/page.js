"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { PageHeader } from "@/components/common/ui";

function Body() {
  const q = useSearchParams();
  return <ExpenseForm defaultGroupId={q.get("group") ?? ""} defaultFriendId={q.get("friend") ?? ""} />;
}
export default function NewExpense() {
  return <><PageHeader title="Add expense" subtitle="Just for you, with friends, or in a group." /><Suspense><Body /></Suspense></>;
}
