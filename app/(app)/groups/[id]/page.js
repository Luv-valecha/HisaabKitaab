"use client";
import { use } from "react";
import GroupDetail from "@/components/groups/GroupDetail";
export default function Page({ params }) { const { id } = use(params); return <GroupDetail id={id} />; }
