import { db } from "./db";
import { groups, user } from "./db/schema";
import { eq, inArray } from "drizzle-orm";
import type { Group, Member } from "./types";

// In-memory fallback map for local development & build environments
const globalRoomStore = globalThis as unknown as {
  __roomStore?: Map<string, { group: Group; updatedAt: number }>;
};

if (!globalRoomStore.__roomStore) {
  globalRoomStore.__roomStore = new Map();
}

/**
 * Fetches latest group data and timestamp from Neon DB (with memory fallback).
 */
export async function getCloudGroup(
  id: string
): Promise<{ group: Group; updatedAt: number } | null> {
  if (process.env.DATABASE_URL) {
    try {
      const rows = await db
        .select()
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        let membersList: Member[] = (row.members as any) || [];

        // Enrich members with upiId from user table
        const memberIds = membersList.map((m) => m.id).filter(Boolean);
        if (memberIds.length > 0) {
          try {
            const userRows = await db
              .select({ id: user.id, upiId: user.upiId, upiName: user.upiName })
              .from(user)
              .where(inArray(user.id, memberIds));

            const upiMap = new Map(
              userRows.map((u) => [u.id, { upiId: u.upiId, upiName: u.upiName }])
            );

            membersList = membersList.map((m) => {
              const u = upiMap.get(m.id);
              return {
                ...m,
                upiId: u?.upiId || m.upiId || undefined,
                upiName: u?.upiName || m.upiName || undefined,
              };
            });
          } catch (e) {
            // ignore fallback
          }
        }

        const groupObj: Group = {
          id: row.id,
          name: row.name,
          currency: row.currency,
          payeeId: row.payeeId || "",
          ownerId: row.ownerId || undefined,
          createdAt: row.createdAt,
          members: membersList,
          items: (row.items as any) || [],
          splits: (row.splits as any) || [],
        };
        const updatedAtTime = row.updatedAt
          ? new Date(row.updatedAt).getTime()
          : Date.now();
        return { group: groupObj, updatedAt: updatedAtTime };
      }
    } catch (err) {
      console.error("Neon DB get error:", err);
    }
  }

  // Fallback to in-memory store
  const stored = globalRoomStore.__roomStore?.get(id);
  return stored || null;
}

/**
 * Saves/updates latest group data and timestamp in Neon DB (with optional user ownerId).
 */
export async function saveCloudGroup(
  group: Group,
  ownerId?: string | null
): Promise<number> {
  const updatedAt = Date.now();
  const updatedAtDate = new Date(updatedAt);
  const payload = { group, updatedAt };

  // Update in-memory fallback
  globalRoomStore.__roomStore?.set(group.id, payload);

  if (process.env.DATABASE_URL) {
    try {
      if (ownerId) {
        try {
          await db
            .insert(user)
            .values({
              id: ownerId,
              name: "User",
              email: `${ownerId}@user.local`,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoNothing();
        } catch (e) {
          // ignore
        }
      }
      await db
        .insert(groups)
        .values({
          id: group.id,
          name: group.name,
          currency: group.currency,
          payeeId: group.payeeId,
          ...(ownerId ? { ownerId } : {}),
          members: group.members as any,
          items: group.items as any,
          splits: (group.splits || []) as any,
          createdAt: group.createdAt,
          updatedAt: updatedAtDate,
        })
        .onConflictDoUpdate({
          target: groups.id,
          set: {
            name: group.name,
            currency: group.currency,
            payeeId: group.payeeId,
            ...(ownerId ? { ownerId } : {}),
            members: group.members as any,
            items: group.items as any,
            splits: (group.splits || []) as any,
            updatedAt: updatedAtDate,
          },
        });
    } catch (err) {
      console.error("Neon DB save error:", err);
    }
  }

  return updatedAt;
}

/**
 * Permanently deletes group from Neon DB and in-memory cache.
 */
export async function deleteCloudGroup(id: string): Promise<void> {
  globalRoomStore.__roomStore?.delete(id);
  if (process.env.DATABASE_URL) {
    try {
      await db.delete(groups).where(eq(groups.id, id));
    } catch (err) {
      console.error("Neon DB delete error:", err);
    }
  }
}
