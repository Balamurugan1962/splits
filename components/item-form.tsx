"use client";

import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { LockIcon } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { computeShares } from "@/lib/split";
import type { Item, ItemShare, Member } from "@/lib/types";

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currency: string;
  editItem?: Item | null;
  onSaved: (item: Item) => void;
}

export function ItemForm({
  open,
  onOpenChange,
  members,
  currency,
  editItem,
  onSaved,
}: ItemFormProps) {
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [includedIds, setIncludedIds] = useState<string[]>(
    members.map((m) => m.id)
  );
  // Carries forward locked shares from an existing item being edited
  const [baseShares, setBaseShares] = useState<ItemShare[]>([]);
  const [priceError, setPriceError] = useState("");
  const [memberError, setMemberError] = useState("");

  useEffect(() => {
    if (open) {
      if (editItem) {
        setItemName(editItem.name);
        setPrice(editItem.price.toString());
        setIncludedIds(editItem.includedMemberIds);
        setBaseShares(editItem.shares);
      } else {
        setItemName("");
        setPrice("");
        setIncludedIds(members.map((m) => m.id));
        setBaseShares([]);
      }
      setPriceError("");
      setMemberError("");
    }
  }, [open, editItem, members]);

  function toggleMember(id: string) {
    setIncludedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (memberError) setMemberError("");
  }

  // Live preview: compute shares using the same lock/unlock logic as ItemRow.
  // For edit: locked shares for already-included members are preserved.
  // Newly added members are unlocked and get an equal share of the remainder.
  const parsedPrice = parseFloat(price);
  const validPrice = !isNaN(parsedPrice) && parsedPrice > 0;

  const previewShares = useMemo<ItemShare[]>(() => {
    if (!validPrice || includedIds.length === 0) return [];
    const previewItem: Item = {
      id: editItem?.id ?? "",
      name: "",
      price: Math.round(parsedPrice * 100) / 100,
      includedMemberIds: includedIds,
      shares: baseShares,
    };
    return computeShares(previewItem);
  }, [validPrice, parsedPrice, includedIds, baseShares, editItem]);

  function handleSave() {
    if (!price || !validPrice) {
      setPriceError("Enter a valid price greater than 0.");
      return;
    }
    if (includedIds.length === 0) {
      setMemberError("Select at least one member.");
      return;
    }

    const item: Item = {
      id: editItem?.id ?? uuidv4(),
      name: itemName.trim(),
      price: Math.round(parsedPrice * 100) / 100,
      includedMemberIds: includedIds,
      shares: baseShares,
    };
    item.shares = computeShares(item);
    onSaved(item);
    onOpenChange(false);
  }

  const isEditing = !!editItem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">
              Item Name{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="item-name"
              placeholder="e.g. Dinner"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-price">Price ({currency})</Label>
            <Input
              id="item-price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (priceError) setPriceError("");
              }}
            />
            {priceError && (
              <p className="text-base text-destructive">{priceError}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Split Between</Label>
              {validPrice && includedIds.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Share preview
                </span>
              )}
            </div>

            <div
              className="space-y-1 overflow-y-auto pr-1 border border-border p-1"
              style={{ maxHeight: "220px" }}
              role="group"
              aria-label="Member selection"
            >
              {members.map((m) => {
                const isIncluded = includedIds.includes(m.id);
                const share = previewShares.find((s) => s.memberId === m.id);
                const isLocked = share?.locked ?? false;

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between gap-3 px-2 py-1.5 transition-colors ${
                      isIncluded ? "bg-muted/30" : "opacity-40"
                    }`}
                  >
                    {/* Checkbox + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        id={`member-${m.id}`}
                        checked={isIncluded}
                        onCheckedChange={() => toggleMember(m.id)}
                        className="h-5 w-5"
                      />
                      <label
                        htmlFor={`member-${m.id}`}
                        className="text-lg cursor-pointer select-none truncate"
                      >
                        {m.name}
                      </label>
                    </div>

                    {/* Live share preview — only when member is included and price is valid */}
                    {isIncluded && validPrice && share !== undefined && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLocked && (
                          <LockIcon className="h-4 w-4 text-primary/70" />
                        )}
                        <span
                          className={`text-base tabular-nums font-medium ${
                            isLocked
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {currency}
                          {share.amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {memberError && (
              <p className="text-base text-destructive">{memberError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 text-base w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-11 text-base w-full sm:w-auto">
            {isEditing ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
