"use client";

import Link from "next/link";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";

export function UserNav() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="h-9 w-24 animate-pulse bg-muted rounded-md" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium hidden sm:inline text-foreground">
          {session.user.name || session.user.email}
        </span>
        <Link href="/settings">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 px-0"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut()}
          className="gap-1.5 text-xs sm:text-sm h-9 px-2.5"
          title="Sign Out"
        >
          <LogOutIcon className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    );
  }

  return null;
}
