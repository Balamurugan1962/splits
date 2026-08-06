"use client";

import { useState, useCallback, useEffect } from "react";
import type { Group, Item } from "@/lib/types";
import { getGroup, saveGroup } from "@/lib/storage";
import { computeShares } from "@/lib/split";

export function useGroup(id: string) {
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    const g = getGroup(id);
    setGroup(g ?? null);
  }, [id]);

  const persist = useCallback((next: Group) => {
    saveGroup(next);
    setGroup(next);
  }, []);

  const updateGroup = useCallback(
    (patch: Partial<Pick<Group, "name" | "payeeId" | "currency" | "members">>) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        // If members changed, remove items' includedMemberIds that no longer exist
        if (patch.members) {
          const memberIds = new Set(patch.members.map((m) => m.id));
          next.items = next.items.map((item) => {
            const newIncluded = item.includedMemberIds.filter((mid) => memberIds.has(mid));
            const newItem = { ...item, includedMemberIds: newIncluded };
            newItem.shares = computeShares(newItem);
            return newItem;
          });
        }
        saveGroup(next);
        return next;
      });
    },
    []
  );

  const addItem = useCallback(
    (item: Item) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const withShares = { ...item, shares: computeShares(item) };
        const next = { ...prev, items: [...prev.items, withShares] };
        saveGroup(next);
        return next;
      });
    },
    []
  );

  const updateItem = useCallback((item: Item) => {
    setGroup((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        items: prev.items.map((it) => (it.id === item.id ? item : it)),
      };
      saveGroup(next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setGroup((prev) => {
      if (!prev) return prev;
      const next = { ...prev, items: prev.items.filter((it) => it.id !== itemId) };
      saveGroup(next);
      return next;
    });
  }, []);

  return { group, updateGroup, addItem, updateItem, deleteItem };
}
