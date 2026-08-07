"use client";

import { useState, useEffect } from "react";
import { Share2Icon, CheckIcon, UsersIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";

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
import { CURRENCIES, type Group } from "@/lib/types";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onSaved: (group: Group) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export function EditGroupDialog({
  open,
  onOpenChange,
  group,
  onSaved,
  onDeleteGroup,
}: EditGroupDialogProps) {
  const [groupName, setGroupName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency);
  const [copied, setCopied] = useState(false);
  const [nameError, setNameError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setGroupName(group.name);
    setCurrency(group.currency);
    setConfirmDelete(false);
  }, [group]);

  function handleShareInvite() {
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

  function handleSave() {
    const trimmed = groupName.trim();
    if (!trimmed) {
      setNameError("Group name is required.");
      return;
    }

    setNameError("");
    const updated: Group = {
      ...group,
      name: trimmed,
      currency,
    };
    onSaved(updated);
    onOpenChange(false);
  }

  function handleDelete() {
    if (onDeleteGroup) {
      onDeleteGroup(group.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Group Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-group-name">Group Name</Label>
            <Input
              id="edit-group-name"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (nameError) setNameError("");
              }}
            />
            {nameError && (
              <p className="text-base text-destructive">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-group-currency">Default Currency</Label>
            <Select value={currency} onValueChange={(v) => v !== null && setCurrency(v)}>
              <SelectTrigger id="edit-group-currency" className="w-full h-12">
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

          {/* Group Members (View Only + Invite Button) */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                Group Members ({group.members.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareInvite}
                className="h-9 px-2.5 gap-1.5 text-xs font-medium"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Share2Icon className="h-3.5 w-3.5" />
                    <span>Invite Member</span>
                  </>
                )}
              </Button>
            </div>

            <ul
              className="space-y-1.5 mt-2 overflow-y-auto pr-1"
              style={{ maxHeight: "140px" }}
              aria-label="Member list"
            >
              {group.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border border-border px-3 py-2 text-base bg-muted/20"
                >
                  <span className="font-medium">{m.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Danger Zone: Premium Delete Group Section */}
          {onDeleteGroup && (
            <div className="pt-4 border-t border-destructive/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                    Delete Group
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this group and all its splits.
                  </p>
                </div>

                {!confirmDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="h-9 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive shrink-0 gap-1.5"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>

              {confirmDelete && (
                <div className="p-3.5 border border-destructive/30 bg-destructive/5 space-y-3">
                  <p className="text-xs text-destructive font-medium leading-relaxed">
                    Are you sure? This action cannot be undone and will permanently remove this group for all members.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      className="h-9 px-3 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      className="h-9 px-3 text-xs gap-1.5 font-semibold"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                      Yes, Delete Group
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 text-base">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-11 text-base">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
