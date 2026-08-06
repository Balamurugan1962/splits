"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  Settings2Icon,
  ReceiptIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ItemRow } from "@/components/item-row";
import { ItemForm } from "@/components/item-form";
import { EditGroupDialog } from "@/components/edit-group-dialog";
import { SplitSummary } from "@/components/split-summary";
import { useGroup } from "@/hooks/use-group";
import type { Group, Item } from "@/lib/types";

interface GroupWorkspaceProps {
  id: string;
}

export function GroupWorkspace({ id }: GroupWorkspaceProps) {
  const { group, updateGroup, addItem, updateItem, deleteItem } = useGroup(id);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-lg text-muted-foreground">Group not found.</p>
        <Link href="/">
          <Button variant="outline" className="text-base h-11">Back to home</Button>
        </Link>
      </div>
    );
  }

  const payee = group.members.find((m) => m.id === group.payeeId);

  function handleGroupSaved(updated: Group) {
    updateGroup({
      name: updated.name,
      payeeId: updated.payeeId,
      currency: updated.currency,
      members: updated.members,
    });
  }

  function handleItemSaved(item: Item) {
    if (!group) return;
    if (group.items.find((it) => it.id === item.id)) {
      updateItem(item);
    } else {
      addItem(item);
    }
  }

  function handleItemUpdated(item: Item) {
    updateItem(item);
  }

  function handleDeleteItem(itemId: string) {
    deleteItem(itemId);
  }

  function handleEditItem(item: Item) {
    setEditItem(item);
    setEditItemOpen(true);
  }

  return (
    <>
      {/* Group Header */}
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

            {/* Caption-styled Metadata Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
              <span className="font-bold text-foreground border border-border px-1.5 py-0.5 text-xs bg-muted/40">
                {group.currency}
              </span>
              {payee && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="truncate">
                    Paid upfront by{" "}
                    <strong className="font-semibold text-foreground">
                      {payee.name}
                    </strong>
                  </span>
                </>
              )}
              <span className="text-muted-foreground/40">•</span>
              <span>
                {group.members.length} member{group.members.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

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

      <Separator className="mb-6" />

      {/* Top Split Summary (Unboxed, Continuous Live Settlement Overview) */}
      {group.items.length > 0 && (
        <SplitSummary group={group} />
      )}

      {/* Items Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-xl sm:text-2xl">
            Items
            {group.items.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1.5">
                ({group.items.length})
              </span>
            )}
          </h2>
          <Button
            id="add-item-btn"
            variant="outline"
            className="gap-2 text-base h-11 w-full sm:w-auto shrink-0"
            onClick={() => setAddItemOpen(true)}
          >
            <PlusIcon className="h-5 w-5" />
            Add Item
          </Button>
        </div>

        {group.items.length === 0 ? (
          <div className="border border-dashed border-border py-12 flex flex-col items-center justify-center gap-2">
            <ReceiptIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground">
              No items yet. Add one to start splitting.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                members={group.members}
                currency={group.currency}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item.id)}
                onUpdate={handleItemUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
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
        onOpenChange={(open) => { setEditItemOpen(open); if (!open) setEditItem(null); }}
        members={group.members}
        currency={group.currency}
        editItem={editItem}
        onSaved={handleItemSaved}
      />
      <EditGroupDialog
        open={editGroupOpen}
        onOpenChange={setEditGroupOpen}
        group={group}
        onSaved={handleGroupSaved}
      />
    </>
  );
}
