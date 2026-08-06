"use client";

import { useState } from "react";
import {
  PencilIcon,
  Trash2Icon,
  LockIcon,
  UnlockIcon,
  ChevronRightIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { computeShares, hasLockMismatch } from "@/lib/split";
import type { Item, Member, ItemShare } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  item: Item;
  members: Member[];
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (item: Item) => void;
}

export function ItemRow({
  item,
  members,
  currency,
  onEdit,
  onDelete,
  onUpdate,
}: ItemRowProps) {
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const includedMembers = members.filter((m) =>
    item.includedMemberIds.includes(m.id)
  );

  function getShare(memberId: string): ItemShare | undefined {
    return item.shares.find((s) => s.memberId === memberId);
  }

  function handleShareEdit(memberId: string) {
    const share = getShare(memberId);
    setEditingShareId(memberId);
    setDraftValue(share ? share.amount.toString() : "");
  }

  function commitShareEdit(memberId: string) {
    const parsed = parseFloat(draftValue);
    if (!isNaN(parsed) && parsed >= 0) {
      const updatedShares: ItemShare[] = item.includedMemberIds.map((mid) => {
        const existing = item.shares.find((s) => s.memberId === mid);
        if (mid === memberId) {
          return { memberId: mid, amount: Math.round(parsed * 100) / 100, locked: true };
        }
        return existing ?? { memberId: mid, amount: 0, locked: false };
      });
      const newItem: Item = { ...item, shares: updatedShares };
      newItem.shares = computeShares(newItem);
      onUpdate(newItem);
    }
    setEditingShareId(null);
    setDraftValue("");
  }

  function unlockShare(memberId: string) {
    const updatedShares = item.shares.map((s) =>
      s.memberId === memberId ? { ...s, locked: false } : s
    );
    const newItem = { ...item, shares: updatedShares };
    newItem.shares = computeShares(newItem);
    onUpdate(newItem);
  }

  const displayName = item.name.trim() || null;
  const mismatch = hasLockMismatch(item);
  const hasCustomLocks = item.shares.some(
    (s) => s.locked && item.includedMemberIds.includes(s.memberId)
  );

  const fullParticipantNames = includedMembers.map((m) => m.name).join(", ");
  
  let participantDisplay = "No members";
  if (includedMembers.length === 1) {
    participantDisplay = includedMembers[0].name;
  } else if (includedMembers.length === 2) {
    participantDisplay = `${includedMembers[0].name}, ${includedMembers[1].name}`;
  } else if (includedMembers.length > 2) {
    participantDisplay = `${includedMembers[0].name}, ${includedMembers[1].name} +${includedMembers.length - 2} more`;
  }

  return (
    <div className="border border-border bg-card transition-all">
      {/* Interactive Minimised Header Row */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="group/row flex flex-row items-center justify-between gap-3 px-3.5 sm:px-4 py-3 hover:bg-accent/40 cursor-pointer select-none transition-colors"
      >
        {/* Left: Expand Chevron & Item Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <ChevronRightIcon
            className={cn(
              "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-hover/row:text-foreground",
              !isCollapsed && "rotate-90"
            )}
          />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-base sm:text-lg truncate">
              {displayName ?? (
                <span className="text-muted-foreground italic font-normal text-sm sm:text-base">
                  Unnamed item
                </span>
              )}
            </span>
            {hasCustomLocks && (
              <span
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs border border-primary/40 px-1.5 sm:px-2 py-0.5 text-primary font-medium shrink-0"
                title="Custom share amount locked"
              >
                <LockIcon className="h-3 w-3" />
                Custom
              </span>
            )}
          </div>
        </div>

        {/* Right: Prominent Price Display & Quick Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-1">
          <span className="font-bold text-base sm:text-lg tabular-nums tracking-tight text-foreground">
            {currency}{item.price.toFixed(2)}
          </span>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 border-l border-border pl-2 sm:pl-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Edit item"
            >
              <PencilIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete item"
            >
              <Trash2Icon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Breakdown Body */}
      {!isCollapsed && (
        <>
          <Separator />
          <div className="px-4 py-3 space-y-2 bg-muted/20">
            {includedMembers.length === 0 ? (
              <p className="text-base text-muted-foreground">
                No members assigned to this item.
              </p>
            ) : (
              includedMembers.map((m) => {
                const share = getShare(m.id);
                const isLocked = share?.locked ?? false;
                const isEditing = editingShareId === m.id;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-1.5 transition-colors hover:bg-background"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isLocked ? (
                        <button
                          onClick={() => unlockShare(m.id)}
                          title="Click to unlock"
                          className="text-primary/80 hover:text-primary transition-colors shrink-0"
                          aria-label={`Unlock ${m.name}`}
                        >
                          <LockIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <UnlockIcon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className="text-base sm:text-lg truncate">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {currency}
                      </span>
                      {isEditing ? (
                        <Input
                          autoFocus
                          type="number"
                          min="0"
                          step="0.01"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={() => commitShareEdit(m.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitShareEdit(m.id);
                            if (e.key === "Escape") {
                              setEditingShareId(null);
                              setDraftValue("");
                            }
                          }}
                          className="h-10 w-24 sm:w-28 text-right text-base sm:text-lg px-2"
                          aria-label={`${m.name} share amount`}
                        />
                      ) : (
                        <button
                          onClick={() => handleShareEdit(m.id)}
                          className={`h-10 min-w-[5.5rem] sm:min-w-[6.5rem] text-right text-base sm:text-lg px-3 border transition-colors hover:border-primary/60 hover:bg-accent ${
                            isLocked
                              ? "border-primary/30 bg-primary/5 text-primary font-medium"
                              : "border-transparent text-foreground"
                          }`}
                          title="Click to manually set amount"
                          aria-label={`${m.name} owes ${currency}${
                            share?.amount.toFixed(2) ?? "0.00"
                          }, click to edit`}
                        >
                          {share?.amount.toFixed(2) ?? "0.00"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {mismatch && (
              <Alert variant="destructive" className="mt-2 py-2">
                <AlertDescription className="text-base">
                  Locked amounts ({currency}
                  {item.shares
                    .filter(
                      (s) => s.locked && item.includedMemberIds.includes(s.memberId)
                    )
                    .reduce((sum, s) => sum + s.amount, 0)
                    .toFixed(2)}
                  ) do not add up to {currency}
                  {item.price.toFixed(2)}. Unlock a member to rebalance.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}
    </div>
  );
}
