"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/themes/ThemeProvider";
import { Avatar, Button, Card, PageHeader } from "@/components/common/ui";
import { InstallApp } from "@/components/common/Pwa";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  return (<>
    <PageHeader title="Profile" />
    <div className="space-y-4">
      <Card className="flex items-center gap-4"><Avatar name={user.displayName} size={56} /><div><p className="text-lg font-semibold">{user.displayName}</p><p className="text-sm text-muted">@{user.username}</p><p className="text-sm text-muted">{user.email}</p></div></Card>
      <Card><h2 className="mb-1 text-lg">Theme</h2><p className="mb-3 text-sm text-muted">Current: <b>{theme.name}</b> - {theme.tagline}</p><Link href="/themes" className="btn btn-ghost inline-flex min-h-11 items-center px-4 text-sm">Open theme gallery</Link></Card>
      <Card><h2 className="mb-2 text-lg">Install as an app</h2><InstallApp /></Card>
      <Button variant="danger" onClick={async () => { await logout(); router.replace("/login"); }}>Log out</Button>
    </div></>);
}
