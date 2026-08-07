"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  Settings2Icon,
  ReceiptIcon,
  Share2Icon,
  CheckIcon,
  CalendarIcon,
  UserIcon,
  LayersIcon,
  CheckCircle2Icon,
  HistoryIcon,
  ChevronRightIcon,
  LockIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ItemRow } from "@/components/item-row";
import { ItemForm } from "@/components/item-form";
import { EditGroupDialog } from "@/components/edit-group-dialog";
import { CreateSplitDialog } from "@/components/create-split-dialog";
import { SplitSummary } from "@/components/split-summary";
import { AuthGuard } from "@/components/auth-guard";
import { useRouter } from "next/navigation";
import { useGroup } from "@/hooks/use-group";
import { useSession } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user-profile";
import type { Group, Item, SplitSession } from "@/lib/types";

interface GroupWorkspaceProps {
  id: string;
  splitId?: string;
}

export function GroupWorkspace({ id, splitId }: GroupWorkspaceProps) {
  const router = useRouter();
  const { group, updateGroup } = useGroup(id);
  const { data: session } = useSession();
  const { profile: payeeProfile } = useUserProfile();

  async function handleDeleteGroup(groupId: string) {
    try {
      await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });
      router.push("/");
    } catch (err) {
      console.error("Delete group error:", err);
    }
  }

  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(splitId || null);
  const [createSplitOpen, setCreateSplitOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);

  // Sync selected split when URL changes
  useEffect(() => {
    setSelectedSplitId(splitId || null);
  }, [splitId]);
  const [copied, setCopied] = useState(false);

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-lg text-muted-foreground">Group not found.</p>
        <Link href="/">
          <Button variant="outline" className="text-base h-11">
            Back to home
          </Button>
        </Link>
      </div>
    );
  }

  // Normalize splits (backward compatibility for legacy single-split groups)
  const splits: SplitSession[] =
    group.splits && group.splits.length > 0
      ? group.splits
      : [
          {
            id: "default-split",
            name: "Main Split",
            createdBy: group.ownerId || "",
            createdByName: group.members[0]?.name || "Group Admin",
            createdAt: group.createdAt,
            payeeId: group.payeeId,
            items: group.items || [],
            status: "active",
          },
        ];

  const currentUserId = session?.user?.id;

  // A split is archived in History for the user if:
  // 1. Split status is "closed" (Owner closed it)
  // 2. OR the user marked their share as paid (paidMemberIds includes currentUserId)
  const isSplitClosedForUser = (s: SplitSession) => {
    if (s.status === "closed") return true;
    if (currentUserId && s.paidMemberIds?.includes(currentUserId)) return true;
    return false;
  };

  const isUserOwner = (s: SplitSession) =>
    Boolean(
      currentUserId &&
        ((s.payeeId && s.payeeId === currentUserId) ||
          (!s.payeeId && s.createdBy === currentUserId) ||
          !s.createdBy)
    );

  const activeSplits = splits
    .filter((s) => !isSplitClosedForUser(s))
    .sort((a, b) => {
      const aOwner = isUserOwner(a);
      const bOwner = isUserOwner(b);
      if (aOwner && !bOwner) return -1;
      if (!aOwner && bOwner) return 1;
      return b.createdAt - a.createdAt;
    });

  const closedSplits = splits.filter((s) => isSplitClosedForUser(s));

  const selectedSplit = splits.find((s) => s.id === selectedSplitId);

  const isGroupOwner =
    !group?.ownerId ||
    Boolean(session?.user?.id && group?.ownerId === session.user.id);

  function handleTogglePaidMember(memberId: string) {
    if (!selectedSplit) return;
    const currentPaid = selectedSplit.paidMemberIds || [];
    const nextPaid = currentPaid.includes(memberId)
      ? currentPaid.filter((id) => id !== memberId)
      : [...currentPaid, memberId];

    const payeeId = selectedSplit.payeeId || group?.payeeId;
    const nonPayeeMembers = (group?.members || []).filter((m) => m.id !== payeeId);

    // Auto-close split if all non-payee members have been marked paid
    const isAllPaid =
      nonPayeeMembers.length > 0 &&
      nonPayeeMembers.every((m) => nextPaid.includes(m.id));

    const updatedSplits = splits.map((s) => {
      if (s.id !== selectedSplit.id) return s;
      return {
        ...s,
        paidMemberIds: nextPaid,
        status: isAllPaid ? ("closed" as const) : ("active" as const),
        closedAt: isAllPaid ? (s.closedAt || Date.now()) : undefined,
      };
    });

    updateGroup({
      ...group,
      splits: updatedSplits,
    });
  }

  function handleShareGroup() {
    if (!group) return;
    const inviteUrl = `${window.location.origin}/group/join/${group.id}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl);
    } else {
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleGroupSaved(updated: Group) {
    updateGroup({
      ...group,
      name: updated.name,
      payeeId: updated.payeeId,
      currency: updated.currency,
      members: updated.members,
    });
  }

  function handleCreateSplit(newSplit: SplitSession) {
    if (!group) return;
    const updatedSplits = [newSplit, ...splits];
    updateGroup({
      ...group,
      splits: updatedSplits,
    });
    router.push(`/group/${group.id}/${newSplit.id}`);
  }

  function handleCloseSplit(splitId: string) {
    if (!group) return;
    const updatedSplits = splits.map((s) =>
      s.id === splitId ? { ...s, status: "closed" as const, closedAt: Date.now() } : s
    );

    updateGroup({
      ...group,
      splits: updatedSplits,
    });
    router.push(`/group/${group.id}`);
  }

  function handleReopenSplit(splitId: string) {
    if (!group) return;
    const updatedSplits = splits.map((s) =>
      s.id === splitId ? { ...s, status: "active" as const } : s
    );

    updateGroup({
      ...group,
      splits: updatedSplits,
    });
  }

  function handleItemSaved(item: Item) {
    if (!selectedSplit) return;
    const updatedItems = selectedSplit.items.find((it) => it.id === item.id)
      ? selectedSplit.items.map((it) => (it.id === item.id ? item : it))
      : [...selectedSplit.items, item];

    const updatedSplits = splits.map((s) =>
      s.id === selectedSplit.id ? { ...s, items: updatedItems } : s
    );

    updateGroup({
      ...group,
      items: selectedSplit.id === splits[0].id ? updatedItems : group?.items || [],
      splits: updatedSplits,
    });
  }

  function handleItemUpdated(item: Item) {
    handleItemSaved(item);
  }

  function handleDeleteItem(itemId: string) {
    if (!selectedSplit) return;
    const updatedItems = selectedSplit.items.filter((it: Item) => it.id !== itemId);
    const updatedSplits = splits.map((s) =>
      s.id === selectedSplit.id ? { ...s, items: updatedItems } : s
    );

    updateGroup({
      ...group,
      items: selectedSplit.id === splits[0].id ? updatedItems : group?.items || [],
      splits: updatedSplits,
    });
  }

  // -------------------------------------------------------------
  // DEDICATED SPLIT WORKSPACE VIEW (When a split is clicked)
  // -------------------------------------------------------------
  if (selectedSplit) {
    const currentUserId = session?.user?.id;
    const isSplitOwner = Boolean(
      currentUserId &&
      ((selectedSplit.payeeId && selectedSplit.payeeId === currentUserId) ||
       (!selectedSplit.payeeId && selectedSplit.createdBy === currentUserId) ||
       !selectedSplit.createdBy)
    );

    const isClosed = selectedSplit.status === "closed";
    const isReadOnly = isClosed || !isSplitOwner;

    const splitPayee = group.members.find(
      (m) => m.id === (selectedSplit.payeeId || group.payeeId)
    );

    const splitGroup: Group = {
      ...group,
      payeeId: selectedSplit.payeeId || group.payeeId,
      items: selectedSplit.items,
    };

    return (
      <AuthGuard>
        {/* Back to Group Dashboard Breadcrumb */}
        <div className="mb-4 space-y-3">
          <Link
            href={`/group/${group.id}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to {group.name} Splits
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {selectedSplit.name}
                </h1>
                {isClosed ? (
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] tracking-wider">
                    Closed (Paid)
                  </Badge>
                ) : isSplitOwner ? (
                  <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                    You (Owner)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    View Only
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Paid upfront by <strong className="text-foreground">{splitPayee?.name || "Payee"}</strong>
              </p>
            </div>

            {/* Split is auto-closed when all members pay themselves */}
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Closed Split Banner */}
        {isClosed && (
          <div className="mb-6 p-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle2Icon className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-base">This split is closed & settled!</p>
              <p className="text-xs text-muted-foreground">
                All members have settled their balances. Filed under Group History.
              </p>
            </div>
          </div>
        )}

        {/* Split Summary & WhatsApp settlement */}
        {selectedSplit.items.length > 0 && (
          <SplitSummary
            group={splitGroup}
            split={selectedSplit}
            paidMemberIds={selectedSplit.paidMemberIds}
            onSelfMarkPaid={handleTogglePaidMember}
            currentUserId={session?.user?.id}
            isOwner={isSplitOwner}
            payeeUpiId={payeeProfile?.upiId ?? null}
          />
        )}

        {/* Items Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-xl sm:text-2xl">
              Items in {selectedSplit.name}
              {selectedSplit.items.length > 0 && (
                <span className="text-muted-foreground font-normal ml-1.5">
                  ({selectedSplit.items.length})
                </span>
              )}
            </h2>
            {!isReadOnly && (
              <Button
                id="add-item-btn"
                variant="outline"
                className="gap-2 text-sm sm:text-base h-11 shrink-0"
                onClick={() => setAddItemOpen(true)}
              >
                <PlusIcon className="h-5 w-5" />
                Add Item
              </Button>
            )}
          </div>

          {selectedSplit.items.length === 0 ? (
            <div className="border border-dashed border-border py-12 flex flex-col items-center justify-center gap-2">
              <ReceiptIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-lg text-muted-foreground">
                No items in this split yet.
              </p>
              {!isReadOnly && (
                <Button
                  variant="outline"
                  onClick={() => setAddItemOpen(true)}
                  className="mt-2 h-10 text-sm gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedSplit.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  members={group.members}
                  currency={group.currency}
                  onEdit={() => {
                    setEditItem(item);
                    setEditItemOpen(true);
                  }}
                  onDelete={() => handleDeleteItem(item.id)}
                  onUpdate={handleItemUpdated}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          )}
        </div>

        <ItemForm
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          members={group.members}
          currency={group.currency}
          editItem={null}
          onSaved={handleItemSaved}
        />
        <ItemForm
          open={editItemOpen}
          onOpenChange={(open) => {
            setEditItemOpen(open);
            if (!open) setEditItem(null);
          }}
          members={group.members}
          currency={group.currency}
          editItem={editItem}
          onSaved={handleItemSaved}
        />
      </AuthGuard>
    );
  }

  // -------------------------------------------------------------
  // GROUP DASHBOARD VIEW (Shows Active Splits & Closed History)
  // -------------------------------------------------------------
  return (
    <AuthGuard>
      {/* Group Header Nav */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          All Groups
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5 sm:space-y-2.5">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight truncate">
              {group.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
              <span className="font-bold text-foreground border border-border px-1.5 py-0.5 text-xs bg-muted/40">
                {group.currency}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                {group.members.length} member{group.members.length !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                {activeSplits.length} active split{activeSplits.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareGroup}
              className="h-10 sm:h-11 px-3 gap-1.5 text-xs sm:text-sm font-medium"
              title="Copy shareable group invite link"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Invite Link</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
              onClick={() => setEditGroupOpen(true)}
              aria-label="Edit group settings"
              title="Edit Group Settings"
            >
              <Settings2Icon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Active Splits Section */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayersIcon className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-xl sm:text-2xl">Active Splits</h2>
          </div>

          <Button
            onClick={() => setCreateSplitOpen(true)}
            className="h-10 sm:h-11 px-4 gap-2 text-sm sm:text-base shrink-0"
          >
            <PlusIcon className="h-5 w-5" />
            New Split
          </Button>
        </div>

        {activeSplits.length === 0 ? (
          <div className="border border-dashed border-border py-12 flex flex-col items-center justify-center gap-2 bg-card">
            <LayersIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground">No active splits.</p>
            <Button
              variant="outline"
              onClick={() => setCreateSplitOpen(true)}
              className="mt-2 h-10 text-sm gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create First Split
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeSplits.map((s) => {
              const splitTotal = s.items.reduce((sum, item) => sum + item.price, 0);
              const splitPayee = group.members.find((m) => m.id === (s.payeeId || group.payeeId));
              const isOwner = Boolean(
                currentUserId &&
                ((s.payeeId && s.payeeId === currentUserId) ||
                 (!s.payeeId && s.createdBy === currentUserId) ||
                 !s.createdBy)
              );

              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/group/${group.id}/${s.id}`)}
                  className="group relative border border-border bg-card p-4 hover:border-primary transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-bold text-lg sm:text-xl truncate group-hover:text-primary transition-colors">
                        {s.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Paid upfront by <strong className="text-foreground">{splitPayee?.name || "Payee"}</strong>
                      </p>
                    </div>

                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Total Bill:</span>
                      <span className="font-bold text-foreground">
                        {group.currency}
                        {splitTotal.toFixed(2)}
                      </span>
                    </div>

                    {isOwner ? (
                      <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                        You (Owner)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        View Only
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History (Closed Splits) Section */}
      {closedSplits.length > 0 && (
        <div className="mb-8 space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-bold text-xl sm:text-2xl text-muted-foreground">
              History ({closedSplits.length} Closed)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-80 hover:opacity-100 transition-opacity">
            {closedSplits.map((s) => {
              const splitTotal = s.items.reduce((sum, item) => sum + item.price, 0);

              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/group/${group.id}/${s.id}`)}
                  className="group relative border border-border bg-card/60 p-4 hover:border-foreground/30 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-bold text-lg text-muted-foreground truncate group-hover:text-foreground transition-colors">
                        {s.name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>Closed on {s.closedAt ? new Date(s.closedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Paid"}</span>
                      </p>
                    </div>

                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 font-bold uppercase text-[10px] tracking-wider shrink-0">
                      Closed (Paid)
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Total Bill:</span>
                      <span className="font-bold text-foreground">
                        {group.currency}
                        {splitTotal.toFixed(2)}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <LockIcon className="h-3 w-3" />
                      View Receipt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateSplitDialog
        open={createSplitOpen}
        onOpenChange={setCreateSplitOpen}
        group={group}
        onCreated={handleCreateSplit}
      />
      <EditGroupDialog
        open={editGroupOpen}
        onOpenChange={setEditGroupOpen}
        group={group}
        onSaved={handleGroupSaved}
        onDeleteGroup={handleDeleteGroup}
      />
    </AuthGuard>
  );
}
