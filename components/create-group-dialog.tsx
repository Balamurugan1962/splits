"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (group: Group) => void;
}

type Step = "info" | "members" | "payee";

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateGroupDialogProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("info");
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [payeeId, setPayeeId] = useState("");
  const [nameError, setNameError] = useState("");
  const [memberError, setMemberError] = useState("");

  function reset() {
    setStep("info");
    setGroupName("");
    setCurrency("₹");
    setMembers([]);
    setNewMemberName("");
    setPayeeId("");
    setNameError("");
    setMemberError("");
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

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

  function handleNextFromInfo() {
    const trimmed = groupName.trim();
    if (!trimmed) {
      setNameError("Group name is required.");
      return;
    }
    setNameError("");
    setGroupName(trimmed);
    setStep("members");
  }

  function handleNextFromMembers() {
    if (members.length < 2) {
      setMemberError("Add at least 2 members.");
      return;
    }
    setMemberError("");
    setStep("payee");
  }

  function handleCreate() {
    if (!payeeId) return;
    const group: Group = {
      id: uuidv4(),
      name: groupName,
      payeeId,
      currency,
      members,
      items: [],
      createdAt: Date.now(),
    };
    onCreated(group);
    handleOpenChange(false);
    router.push(`/group/${group.id}`);
  }

  const stepTitle: Record<Step, string> = {
    info: "Create Group",
    members: "Add Members",
    payee: "Select Payee",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitle[step]}</DialogTitle>
        </DialogHeader>

        {step === "info" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="e.g. Goa Trip"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (nameError) setNameError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleNextFromInfo()}
                autoFocus
              />
              {nameError && (
                <p className="text-base text-destructive">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(v) => v !== null && setCurrency(v)}>
                <SelectTrigger id="currency" className="w-full">
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
          </div>
        )}

        {step === "members" && (
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                id="new-member-name"
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => {
                  setNewMemberName(e.target.value);
                  if (memberError) setMemberError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                autoFocus
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
              <>
                <Separator />
                <ul
                  className="space-y-1.5 overflow-y-auto pr-1"
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
              </>
            )}
          </div>
        )}

        {step === "payee" && (
          <div className="space-y-4 py-2">
            <p className="text-base text-muted-foreground">
              Who paid for everything upfront?
            </p>
            <div className="space-y-2">
              <Label htmlFor="payee-select">Payee</Label>
              <Select value={payeeId} onValueChange={(v) => v !== null && setPayeeId(v)}>
                <SelectTrigger id="payee-select" className="w-full">
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
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {step !== "info" && (
            <Button
              variant="outline"
              className="h-11 text-base w-full sm:w-auto"
              onClick={() => setStep(step === "payee" ? "members" : "info")}
            >
              Back
            </Button>
          )}
          {step === "info" && (
            <Button className="h-11 text-base w-full sm:w-auto" onClick={handleNextFromInfo}>Next</Button>
          )}
          {step === "members" && (
            <Button className="h-11 text-base w-full sm:w-auto" onClick={handleNextFromMembers}>Next</Button>
          )}
          {step === "payee" && (
            <Button className="h-11 text-base w-full sm:w-auto" onClick={handleCreate} disabled={!payeeId}>
              Create Group
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
