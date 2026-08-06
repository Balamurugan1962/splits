"use client";

import { useState, useEffect } from "react";
import { PlusIcon, XIcon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { CURRENCIES, type Group, type Member } from "@/lib/types";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onSaved: (group: Group) => void;
}

export function EditGroupDialog({
  open,
  onOpenChange,
  group,
  onSaved,
}: EditGroupDialogProps) {
  const [groupName, setGroupName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency);
  const [members, setMembers] = useState<Member[]>(group.members);
  const [newMemberName, setNewMemberName] = useState("");
  const [payeeId, setPayeeId] = useState(group.payeeId);
  const [memberError, setMemberError] = useState("");

  useEffect(() => {
    if (open) {
      setGroupName(group.name);
      setCurrency(group.currency);
      setMembers(group.members);
      setPayeeId(group.payeeId);
      setNewMemberName("");
      setMemberError("");
    }
  }, [open, group]);

  function addMember() {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setMemberError("A member with this name already exists.");
      return;
    }
    setMemberError("");
    setMembers((prev) => [...prev, { id: uuidv4(), name: trimmed }]);
    setNewMemberName("");
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (payeeId === id) setPayeeId("");
  }

  function handleSave() {
    const trimmedName = groupName.trim();
    if (!trimmedName || members.length < 2 || !payeeId) return;
    onSaved({ ...group, name: trimmedName, currency, members, payeeId });
    onOpenChange(false);
  }

  const canSave =
    groupName.trim().length > 0 && members.length >= 2 && !!payeeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-group-name">Group Name</Label>
            <Input
              id="edit-group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-currency">Currency</Label>
            <Select value={currency} onValueChange={(v) => v !== null && setCurrency(v)}>
              <SelectTrigger id="edit-currency" className="w-full">
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

          <div className="space-y-2">
            <Label>Members</Label>
            <div className="flex gap-2">
              <Input
                id="edit-new-member"
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => {
                  setNewMemberName(e.target.value);
                  if (memberError) setMemberError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addMember}
                aria-label="Add member"
                className="h-12 w-12 shrink-0"
              >
                <PlusIcon className="h-5 w-5" />
              </Button>
            </div>
            {memberError && (
              <p className="text-base text-destructive">{memberError}</p>
            )}
            {members.length > 0 && (
              <ul
                className="space-y-1.5 mt-2 overflow-y-auto pr-1"
                style={{ maxHeight: "220px" }}
                aria-label="Member list"
              >
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between border border-border px-3 py-2.5 text-lg"
                  >
                    <span>{m.name}</span>
                    <button
                      onClick={() => removeMember(m.id)}
                      aria-label={`Remove ${m.name}`}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="edit-payee-select">Payee</Label>
            <Select value={payeeId} onValueChange={(v) => v !== null && setPayeeId(v)}>
              <SelectTrigger id="edit-payee-select" className="w-full">
                <SelectValue placeholder="Select a member">
                  {payeeId
                    ? members.find((m) => m.id === payeeId)?.name
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" className="h-11 text-base w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11 text-base w-full sm:w-auto" onClick={handleSave} disabled={!canSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
