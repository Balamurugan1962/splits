"use client";

import { useState } from "react";
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
import type { Group, SplitSession } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

interface CreateSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onCreated: (split: SplitSession) => void;
}

export function CreateSplitDialog({
  open,
  onOpenChange,
  group,
  onCreated,
}: CreateSplitDialogProps) {
  const { data: session } = useSession();
  const [splitName, setSplitName] = useState("");
  const [payeeId, setPayeeId] = useState(group.payeeId || group.members[0]?.id || "");
  const [nameError, setNameError] = useState("");

  function reset() {
    setSplitName("");
    setPayeeId(group.payeeId || group.members[0]?.id || "");
    setNameError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = splitName.trim();
    if (!trimmed) {
      setNameError("Split title is required.");
      return;
    }

    if (!session?.user?.id) {
      setNameError("You must be signed in to create a split.");
      return;
    }

    const newSplit: SplitSession = {
      id: uuidv4(),
      name: trimmed,
      createdBy: session.user.id,
      createdByName: session.user.name || session.user.email || "You",
      createdAt: Date.now(),
      payeeId: payeeId || group.members[0]?.id || "",
      items: [],
    };

    onCreated(newSplit);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Split</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="split-name-input">Split Title / Occasion</Label>
            <Input
              id="split-name-input"
              placeholder="e.g. Day 1 Dinner, Hotel Booking"
              value={splitName}
              onChange={(e) => {
                setSplitName(e.target.value);
                if (nameError) setNameError("");
              }}
              autoFocus
            />
            {nameError && (
              <p className="text-sm text-destructive font-medium">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="split-payee-select">Who paid upfront for this split?</Label>
            <Select
              value={payeeId}
              onValueChange={(v) => v !== null && setPayeeId(v)}
            >
              <SelectTrigger id="split-payee-select" className="w-full h-12">
                <SelectValue placeholder="Select payee">
                  {group.members.find((m) => m.id === payeeId)?.name || "Select payee"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {group.members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="h-11 text-base"
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11 text-base min-w-28">
              Create Split
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
