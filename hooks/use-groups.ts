"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Group } from "@/lib/types";
import { loadGroups, saveGroups, deleteGroup as storageDelete } from "@/lib/storage";
import { useSession } from "@/lib/auth-client";

// Cache TTL: re-fetch from cloud at most every 15 seconds
const CACHE_TTL_MS = 15_000;

export function useGroups() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const lastFetchedAt = useRef<number>(0);
  const isFetchingRef = useRef(false);

  const fetchRemoteGroups = useCallback(
    async (force = false) => {
      if (!session?.user) {
        setGroups([]);
        saveGroups([]);
        return;
      }

      // Deduplicate: skip if already fetching
      if (isFetchingRef.current) return;

      // TTL guard: skip if fetched recently (unless forced)
      const now = Date.now();
      if (!force && now - lastFetchedAt.current < CACHE_TTL_MS) return;

      isFetchingRef.current = true;
      try {
        const res = await fetch("/api/groups", {
          // Use default browser cache + revalidate on stale
          cache: "default",
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.groups)) {
            const userGroups = data.groups.sort(
              (a: Group, b: Group) => b.createdAt - a.createdAt
            );
            saveGroups(userGroups);
            setGroups(userGroups);
            lastFetchedAt.current = Date.now();
          }
        }
      } catch (err) {
        console.error("fetchRemoteGroups error:", err);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    if (session?.user) {
      // Immediately show cached local data for zero-latency perceived load
      const local = loadGroups();
      setGroups(local);
      // Then fetch from cloud (force=true on session init)
      fetchRemoteGroups(true);
    } else {
      setGroups([]);
    }
  }, [session?.user?.id]);

  const createGroup = useCallback(
    async (group: Group) => {
      // Optimistic update: local state changes immediately
      setGroups((prev) => {
        const next = [group, ...prev.filter((g) => g.id !== group.id)];
        saveGroups(next);
        return next;
      });

      try {
        await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group }),
        });
        // Invalidate TTL so next access re-fetches
        lastFetchedAt.current = 0;
      } catch (err) {
        console.error("POST /api/groups sync error:", err);
      }
    },
    []
  );

  const updateGroup = useCallback(
    (group: Group) => {
      // Optimistic update first
      setGroups((prev) => {
        const next = prev.map((g) => (g.id === group.id ? group : g));
        saveGroups(next);
        return next;
      });

      // Fire-and-forget PUT (no re-fetch needed — optimistic state is source of truth)
      fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group }),
      }).catch((err) => console.error("POST /api/groups update error:", err));
    },
    []
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      // Optimistic removal
      storageDelete(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));

      try {
        await fetch(`/api/groups/${id}`, { method: "DELETE" });
        lastFetchedAt.current = 0;
      } catch (err) {
        console.error("DELETE /api/groups/[id] error:", err);
      }
    },
    []
  );

  return {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    refresh: () => fetchRemoteGroups(true),
  };
}
