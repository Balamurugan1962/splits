import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { groups, user } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, or, sql, desc, inArray } from "drizzle-orm";
import type { Group } from "@/lib/types";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ groups: [] });
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Database-level filtering in Neon DB via PostgreSQL JSONB query
    const rows = await db
      .select()
      .from(groups)
      .where(
        or(
          eq(groups.ownerId, userId),
          sql`exists (
            select 1 
            from jsonb_array_elements(${groups.members}) as elem 
            where elem->>'id' = ${userId}
          )`
        )
      )
      .orderBy(desc(groups.updatedAt));

    // Collect all member IDs to enrich upiId
    const allMemberIds = Array.from(
      new Set(rows.flatMap((r) => ((r.members as any[]) || []).map((m) => m.id)).filter(Boolean))
    );

    let upiMap = new Map<string, { upiId?: string; upiName?: string }>();
    if (allMemberIds.length > 0) {
      try {
        const userRows = await db
          .select({ id: user.id, upiId: user.upiId, upiName: user.upiName })
          .from(user)
          .where(inArray(user.id, allMemberIds));
        upiMap = new Map(
          userRows.map((u) => [
            u.id,
            { upiId: u.upiId || undefined, upiName: u.upiName || undefined },
          ])
        );
      } catch (e) {
        // ignore
      }
    }

    const list: Group[] = rows.map((row) => {
      const rawMembers: any[] = (row.members as any) || [];
      const enrichedMembers = rawMembers.map((m) => {
        const u = upiMap.get(m.id);
        return {
          ...m,
          upiId: u?.upiId || m.upiId || undefined,
          upiName: u?.upiName || m.upiName || undefined,
        };
      });

      return {
        id: row.id,
        name: row.name,
        currency: row.currency,
        payeeId: row.payeeId || "",
        ownerId: row.ownerId || undefined,
        createdAt: row.createdAt,
        members: enrichedMembers,
        items: (row.items as any) || [],
        splits: (row.splits as any) || [],
      };
    });

    return NextResponse.json(
      { groups: list },
      {
        headers: {
          // Private (per-user) cache, serve stale for up to 10s while revalidating
          "Cache-Control": "private, max-age=0, stale-while-revalidate=10",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/groups error:", err);
    return NextResponse.json({ groups: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const group = body.group as Group;
    if (!group || !group.id || !group.name) {
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    }

    const userId = session.user.id;
    const userName = session.user.name || session.user.email || "You";

    // Bind ownerId to logged in user ID
    group.ownerId = userId;

    // Ensure member array includes creator's user ID
    const currentMembers = Array.isArray(group.members) ? group.members : [];
    const hasUserMember = currentMembers.some((m) => m.id === userId);
    if (!hasUserMember) {
      currentMembers.unshift({ id: userId, name: userName });
    }
    group.members = currentMembers;
    if (!group.payeeId) {
      group.payeeId = userId;
    }

    if (process.env.DATABASE_URL) {
      // Ensure user record exists in DB to satisfy foreign key constraint
      try {
        await db
          .insert(user)
          .values({
            id: userId,
            name: userName,
            email: session.user.email || `${userId}@user.local`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      } catch (userErr) {
        console.warn("User upsert warning:", userErr);
      }

      await db
        .insert(groups)
        .values({
          id: group.id,
          name: group.name,
          currency: group.currency,
          payeeId: group.payeeId,
          ownerId: userId,
          members: group.members as any,
          items: group.items as any,
          splits: (group.splits || []) as any,
          createdAt: group.createdAt,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: groups.id,
          set: {
            name: group.name,
            currency: group.currency,
            payeeId: group.payeeId,
            ownerId: userId,
            members: group.members as any,
            items: group.items as any,
            splits: (group.splits || []) as any,
            updatedAt: new Date(),
          },
        });
    }

    return NextResponse.json({ success: true, group });
  } catch (err) {
    console.error("POST /api/groups error:", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
