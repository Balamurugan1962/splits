"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Group, Item } from "@/lib/types";
import { getGroup, saveGroup } from "@/lib/storage";
import { computeShares } from "@/lib/split";

// Debounce delay for cloud pushes (batches rapid local mutations)
const PUSH_DEBOUNCE_MS = 800;

// Background sync interval – only fires if tab is visible & data may be stale
const POLL_INTERVAL_MS = 30_000;

export function useGroup(id: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const pendingPushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Debounced cloud push – batches rapid mutations into a single network call
  const pushToCloud = useCallback(
    (g: Group) => {
      if (pendingPushRef.current) {
        clearTimeout(pendingPushRef.current);
      }
      pendingPushRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;
        try {
          const res = await fetch(`/api/groups/${g.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ group: g }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.updatedAt) {
              lastSyncTimeRef.current = data.updatedAt;
            }
          }
        } catch {
          // Silently fail — local state is already updated
        }
      }, PUSH_DEBOUNCE_MS);
    },
    []
  );

  // Pull from cloud only when data may be stale
  const pullFromCloud = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const res = await fetch(`/api/groups/${id}`, {
        // Let browser cache for 5s to prevent duplicate in-flight requests
        cache: "no-cache",
        headers: { "If-Modified-Since": new Date(lastSyncTimeRef.current).toUTCString() },
      });
      if (!res.ok) return;
      if (res.status === 304) return; // Not modified
      const data = await res.json();
      if (
        data.group &&
        data.updatedAt > lastSyncTimeRef.current &&
        isMountedRef.current
      ) {
        lastSyncTimeRef.current = data.updatedAt;
        const cloudGroup = data.group as Group;
        saveGroup(cloudGroup);
        setGroup(cloudGroup);
      }
    } catch {
      // Ignore network failures for offline resilience
    }
  }, [id]);

  // Initial load: local-first → cloud sync on visibility, not on every mount
  useEffect(() => {
    isMountedRef.current = true;

    const localGroup = getGroup(id);
    if (localGroup) {
      setGroup(localGroup);
      // Sync from cloud once on mount (no push — avoid unnecessary writes)
      pullFromCloud();
    } else {
      // Not in localStorage — fetch from cloud (shared link / new device)
      pullFromCloud();
    }

    // Background sync: only when tab is visible, every 30s
    let interval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          pullFromCloud();
        }
      }, POLL_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Tab refocused — pull immediately then restart polling
        pullFromCloud();
        if (interval) clearInterval(interval);
        startPolling();
      } else {
        // Tab hidden — stop polling to save resources
        if (interval) clearInterval(interval);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();

    return () => {
      isMountedRef.current = false;
      if (interval) clearInterval(interval);
      if (pendingPushRef.current) clearTimeout(pendingPushRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, pullFromCloud]);

  const persist = useCallback(
    (next: Group) => {
      saveGroup(next);
      setGroup(next);
      pushToCloud(next);
    },
    [pushToCloud]
  );

  const updateGroup = useCallback(
    (patch: Partial<Group>) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        if (patch.members) {
          const memberIds = new Set(patch.members.map((m) => m.id));
          next.items = next.items.map((item) => {
            const newIncluded = item.includedMemberIds.filter((mid) =>
              memberIds.has(mid)
            );
            const newItem = { ...item, includedMemberIds: newIncluded };
            newItem.shares = computeShares(newItem);
            return newItem;
          });
        }
        saveGroup(next);
        pushToCloud(next);
        return next;
      });
    },
    [pushToCloud]
  );

  const addItem = useCallback(
    (item: Item) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const withShares = { ...item, shares: computeShares(item) };
        const next = { ...prev, items: [...prev.items, withShares] };
        saveGroup(next);
        pushToCloud(next);
        return next;
      });
    },
    [pushToCloud]
  );

  const updateItem = useCallback(
    (item: Item) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          items: prev.items.map((it) => (it.id === item.id ? item : it)),
        };
        saveGroup(next);
        pushToCloud(next);
        return next;
      });
    },
    [pushToCloud]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      setGroup((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          items: prev.items.filter((it) => it.id !== itemId),
        };
        saveGroup(next);
        pushToCloud(next);
        return next;
      });
    },
    [pushToCloud]
  );

  return { group, updateGroup, addItem, updateItem, deleteItem, refresh: pullFromCloud };
}
