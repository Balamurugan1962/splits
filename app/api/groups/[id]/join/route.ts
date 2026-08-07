import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCloudGroup, saveCloudGroup } from "@/lib/room-store";
import type { Group, Member } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in required to join." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = session.user.id;
    const userName = session.user.name || session.user.email || "Member";

    const stored = await getCloudGroup(id);

    if (!stored || !stored.group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = stored.group;
    const currentMembers: Member[] = group.members || [];

    // Check if user is already a member
    const existingIndex = currentMembers.findIndex((m) => m.id === userId);
    let updatedMembers = [...currentMembers];

    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = { id: userId, name: userName };
    } else {
      updatedMembers.push({ id: userId, name: userName });
    }

    const updatedGroup: Group = {
      ...group,
      members: updatedMembers,
    };

    // Save updated group to Neon DB & cloud room store
    await saveCloudGroup(updatedGroup, group.ownerId || userId);

    return NextResponse.json({ success: true, group: updatedGroup });
  } catch (err) {
    console.error("POST /api/groups/[id]/join error:", err);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
