import type { Group, Item, ItemShare } from "./types";

/**
 * Recomputes shares for an item given its current state.
 * Locked shares stay fixed; the remaining amount is split
 * equally among unlocked members. The last unlocked member
 * absorbs any leftover paise from rounding.
 */
export function computeShares(item: Item): ItemShare[] {
  const { price, includedMemberIds, shares } = item;
  if (includedMemberIds.length === 0) return [];

  // Keep locked shares only for currently included members
  const lockedShares = shares.filter(
    (s) => s.locked && includedMemberIds.includes(s.memberId)
  );
  const unlockedMemberIds = includedMemberIds.filter(
    (id) => !lockedShares.find((s) => s.memberId === id)
  );

  const lockedTotal = lockedShares.reduce((sum, s) => sum + s.amount, 0);
  const remainder = Math.round((price - lockedTotal) * 100) / 100;

  const newShares: ItemShare[] = [];
  if (unlockedMemberIds.length > 0) {
    // Floor to 2 decimal places for each member, last gets the remainder
    const base = Math.floor((remainder / unlockedMemberIds.length) * 100) / 100;
    const baseTotal = Math.round(base * unlockedMemberIds.length * 100) / 100;
    const leftover = Math.round((remainder - baseTotal) * 100) / 100;

    unlockedMemberIds.forEach((memberId, idx) => {
      const isLast = idx === unlockedMemberIds.length - 1;
      newShares.push({
        memberId,
        amount: isLast ? Math.round((base + leftover) * 100) / 100 : base,
        locked: false,
      });
    });
  }

  return [...lockedShares, ...newShares];
}

/**
 * Sums each member's shares across all items in the group.
 * Returns a map of memberId -> total owed amount.
 */
export function computeSummary(group: Pick<Group, "members" | "items">): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const member of group.members) {
    totals[member.id] = 0;
  }
  for (const item of group.items) {
    for (const share of item.shares) {
      if (share.memberId in totals) {
        totals[share.memberId] = Math.round((totals[share.memberId] + share.amount) * 100) / 100;
      }
    }
  }
  return totals;
}

/**
 * Returns true when all locked shares for an item don't sum to the item price
 * (only relevant when every included member is locked).
 */
export function hasLockMismatch(item: Item): boolean {
  const { price, includedMemberIds, shares } = item;
  if (includedMemberIds.length === 0) return false;
  const lockedShares = shares.filter(
    (s) => s.locked && includedMemberIds.includes(s.memberId)
  );
  const allLocked = lockedShares.length === includedMemberIds.length;
  if (!allLocked) return false;
  const lockedTotal = Math.round(lockedShares.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
  return Math.abs(lockedTotal - price) >= 0.01;
}
