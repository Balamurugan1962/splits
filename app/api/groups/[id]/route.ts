import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCloudGroup, saveCloudGroup, deleteCloudGroup } from "@/lib/room-store";
import type { Group, SplitSession } from "@/lib/types";

// Helper to check if a user is a member of a group
function isGroupMember(group: Group, userId: string): boolean {
  if (!group) return false;
  if (group.ownerId === userId) return true;
  return Array.isArray(group.members) && group.members.some((m) => m.id === userId);
}

// Helper to check if a user is the owner/payee of a specific split
function isSplitOwner(group: Group, split: SplitSession, userId: string): boolean {
  if (!group || !split) return false;
  if (group.ownerId === userId) return true;
  if (split.payeeId && split.payeeId === userId) return true;
  if (!split.payeeId && split.createdBy === userId) return true;
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized. Sign in required." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const stored = await getCloudGroup(id);
  if (!stored || !stored.group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Security Check: User must be a group member or owner
  const userId = session.user.id;
  if (!isGroupMember(stored.group, userId)) {
    return NextResponse.json(
      { error: "Forbidden. You are not a member of this group." },
      { status: 403 }
    );
  }

  const lastModified = new Date(stored.updatedAt).toUTCString();
  const ifModifiedSince = (request as Request).headers.get("If-Modified-Since");

  if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(stored.updatedAt)) {
    return new Response(null, { status: 304 });
  }

  return NextResponse.json(stored, {
    headers: {
      "Cache-Control": "private, max-age=0, stale-while-revalidate=10",
      "Last-Modified": lastModified,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized. Sign in required." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const userId = session.user.id;

  try {
    const body = await request.json();
    const incomingGroup = body.group as Group;
    if (!incomingGroup || incomingGroup.id !== id) {
      return NextResponse.json({ error: "Invalid group data" }, { status: 400 });
    }

    const stored = await getCloudGroup(id);
    if (!stored || !stored.group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const existingGroup = stored.group;

    // Security Check 1: User must be an authenticated member of the group
    if (!isGroupMember(existingGroup, userId)) {
      return NextResponse.json(
        { error: "Forbidden. You are not a member of this group." },
        { status: 403 }
      );
    }

    // Security Check 2: Server-Side Split & Self-Payment Validation
    const incomingSplits: SplitSession[] = incomingGroup.splits || [];
    const existingSplits: SplitSession[] = existingGroup.splits || [];

    for (const incSplit of incomingSplits) {
      const extSplit = existingSplits.find((s) => s.id === incSplit.id);

      if (extSplit) {
        const itemsChanged =
          JSON.stringify(incSplit.items) !== JSON.stringify(extSplit.items);
        const paidChanged =
          JSON.stringify(incSplit.paidMemberIds) !==
          JSON.stringify(extSplit.paidMemberIds);
        const statusChanged = incSplit.status !== extSplit.status;

        const isOwner = isSplitOwner(existingGroup, extSplit, userId);

        if (!isOwner) {
          // 1. Non-owners cannot edit items
          if (itemsChanged) {
            return NextResponse.json(
              { error: "Forbidden. Only the split owner can edit items." },
              { status: 403 }
            );
          }

          // 2. Non-owners can ONLY toggle their OWN member ID in paidMemberIds
          if (paidChanged) {
            const extOthers = (extSplit.paidMemberIds || []).filter((id) => id !== userId).sort();
            const incOthers = (incSplit.paidMemberIds || []).filter((id) => id !== userId).sort();
            if (JSON.stringify(extOthers) !== JSON.stringify(incOthers)) {
              return NextResponse.json(
                { error: "Forbidden. You can only update your own payment status." },
                { status: 403 }
              );
            }
          }

          // 3. Non-owners can only trigger status change if all non-payees are paid (auto-close)
          if (statusChanged) {
            const payeeId = incSplit.payeeId || existingGroup.payeeId;
            const nonPayeeMembers = (existingGroup.members || []).filter((m) => m.id !== payeeId);
            const incPaid = incSplit.paidMemberIds || [];
            const isAutoClose =
              extSplit.status === "active" &&
              incSplit.status === "closed" &&
              nonPayeeMembers.length > 0 &&
              nonPayeeMembers.every((m) => incPaid.includes(m.id));

            if (!isAutoClose) {
              return NextResponse.json(
                { error: "Forbidden. Only split owners can manually change split status." },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    const updatedAt = await saveCloudGroup(incomingGroup, existingGroup.ownerId || userId);
    return NextResponse.json({ success: true, updatedAt });
  } catch (err) {
    console.error("API PUT security validation error:", err);
    return NextResponse.json({ error: "Failed to save group" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized. Sign in required." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const userId = session.user.id;

  try {
    const existing = await getCloudGroup(id);
    if (!existing || !existing.group) {
      return NextResponse.json({ success: true });
    }

    const group = existing.group;
    const isOwner = !group.ownerId || group.ownerId === userId;

    if (isOwner) {
      // Permanent DB + Cache delete for group owner
      await deleteCloudGroup(id);
    } else {
      // Remove current member from joined group
      const updatedMembers = (group.members || []).filter((m) => m.id !== userId);
      const updatedGroup = { ...group, members: updatedMembers };
      await saveCloudGroup(updatedGroup, group.ownerId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/groups/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
