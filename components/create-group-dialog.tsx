"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, type Group, type Member } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (group: Group) => Promise<void> | void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateGroupDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setGroupName("");
    setCurrency("₹");
    setNameError("");
    setIsSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      setNameError("Group name is required.");
      return;
    }

    setNameError("");
    if (!session?.user?.id) {
      setNameError("You must be signed in to create a group.");
      setIsSubmitting(false);
      return;
    }

    const creatorId = session.user.id;
    const creatorName = session.user.name || session.user.email || "You";

    const creatorMember: Member = {
      id: creatorId,
      name: creatorName,
    };

    const group: Group = {
      id: uuidv4(),
      name: trimmed,
      payeeId: creatorId,
      currency,
      members: [creatorMember],
      items: [],
      createdAt: Date.now(),
    };

    try {
      await onCreated(group);
      handleOpenChange(false);
      router.push(`/group/${group.id}`);
    } catch (err) {
      console.error("Create group error:", err);
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="create-group-name">Group Name</Label>
            <Input
              id="create-group-name"
              placeholder="e.g. Goa Trip, Dinner, Rent"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (nameError) setNameError("");
              }}
              autoFocus
            />
            {nameError && (
              <p className="text-sm text-destructive font-medium">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-group-currency">Currency</Label>
            <Select value={currency} onValueChange={(v) => v !== null && setCurrency(v)}>
              <SelectTrigger id="create-group-currency" className="w-full h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.symbol} value={c.symbol}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/40 border border-border p-2.5 rounded">
            Friends join your group automatically when you send them an invite link.
          </p>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="h-11 text-base"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 text-base min-w-28"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
