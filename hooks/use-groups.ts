"use client";

import { useState, useCallback, useEffect } from "react";
import type { Group } from "@/lib/types";
import { loadGroups, saveGroups, deleteGroup as storageDelete } from "@/lib/storage";

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    setGroups(loadGroups());
  }, []);

  const createGroup = useCallback((group: Group) => {
    setGroups((prev) => {
      const next = [...prev, group];
      saveGroups(next);
      return next;
    });
  }, []);

  const updateGroup = useCallback((group: Group) => {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id === group.id ? group : g));
      saveGroups(next);
      return next;
    });
  }, []);

  const deleteGroup = useCallback((id: string) => {
    storageDelete(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { groups, createGroup, updateGroup, deleteGroup };
}
