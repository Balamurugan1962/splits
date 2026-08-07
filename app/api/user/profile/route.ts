import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({ upiId: user.upiId, upiName: user.upiName, name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const profile = rows[0] ?? null;
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { upiId, upiName } = body as { upiId?: string; upiName?: string };

  if (!upiId || typeof upiId !== "string") {
    return NextResponse.json({ error: "Invalid UPI ID" }, { status: 400 });
  }

  // Basic format validation — must contain exactly one @
  const parts = upiId.trim().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return NextResponse.json({ error: "Invalid UPI ID format" }, { status: 400 });
  }

  await db
    .update(user)
    .set({ upiId: upiId.trim().toLowerCase(), upiName: upiName ?? null, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ success: true });
}
