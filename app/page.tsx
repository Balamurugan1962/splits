"use client";

import { useState } from "react";
import { PlusIcon, UsersIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { AuthGuard } from "@/components/auth-guard";
import { useGroups } from "@/hooks/use-groups";
import type { Group } from "@/lib/types";

export default function HomePage() {
  const { groups, createGroup, deleteGroup } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);

  function handleCreated(group: Group) {
    createGroup(group);
  }

  return (
    <AuthGuard>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your Groups</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            Synced securely to your account.
          </p>
        </div>
        <Button
          id="create-group-btn"
          onClick={() => setCreateOpen(true)}
          size="lg"
          className="gap-2 text-base h-11 w-full sm:w-auto shrink-0"
        >
          <PlusIcon className="h-5 w-5" />
          New Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="border border-dashed border-border py-20 flex flex-col items-center justify-center gap-3">
          <UsersIcon className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-lg text-muted-foreground text-center">
            No groups yet. Create one to get started.
          </p>
          <Button
            variant="outline"
            className="text-base h-11"
            onClick={() => setCreateOpen(true)}
            id="create-group-empty-btn"
          >
            Create a Group
          </Button>
        </div>
      ) : (
        <ul className="border border-border divide-y divide-border">
          {groups
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((g) => {
              const payee = g.members.find((m) => m.id === g.payeeId);
              return (
                <li
                  key={g.id}
                  className="group/item flex items-center justify-between px-4 py-3.5 bg-card hover:bg-accent/40 transition-colors"
                >
                  <Link
                    href={`/group/${g.id}`}
                    className="block w-full min-w-0"
                    aria-label={`Open group ${g.name}`}
                  >
                    <p className="font-semibold text-xl truncate">{g.name}</p>
                    <p className="text-base text-muted-foreground mt-0.5">
                      {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                      {" · "}
                      {g.currency}
                    </p>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </AuthGuard>
  );
}
