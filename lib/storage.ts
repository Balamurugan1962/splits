import type { Group } from "./types";

const STORAGE_KEY = "splits-groups";

// In-memory cache to avoid redundant JSON.parse on each read
let _cache: Group[] | null = null;
let _cacheKey = "";

function invalidateCache() {
  _cache = null;
  _cacheKey = "";
}

export function loadGroups(): Group[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "";
    if (_cache && _cacheKey === raw) return _cache;
    const parsed = raw ? (JSON.parse(raw) as Group[]) : [];
    _cache = parsed;
    _cacheKey = raw;
    return parsed;
  } catch {
    return [];
  }
}

export function saveGroups(groups: Group[]): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(groups);
  localStorage.setItem(STORAGE_KEY, serialized);
  // Update in-memory cache immediately
  _cache = groups;
  _cacheKey = serialized;
}

export function getGroup(id: string): Group | undefined {
  // Uses in-memory cache — no extra JSON.parse
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
