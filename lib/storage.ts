import type { Group } from "./types";

const STORAGE_KEY = "splits-groups";

export function loadGroups(): Group[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Group[]) : [];
  } catch {
    return [];
  }
}

export function saveGroups(groups: Group[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function getGroup(id: string): Group | undefined {
  return loadGroups().find((g) => g.id === id);
}

export function saveGroup(group: Group): void {
  const groups = loadGroups();
  const idx = groups.findIndex((g) => g.id === group.id);
  if (idx >= 0) {
    groups[idx] = group;
  } else {
    groups.push(group);
  }
  saveGroups(groups);
}

export function deleteGroup(id: string): void {
  saveGroups(loadGroups().filter((g) => g.id !== id));
}
