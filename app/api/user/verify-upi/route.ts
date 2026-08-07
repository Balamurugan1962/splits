import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { upiId } = body as { upiId?: string };

  if (!upiId || typeof upiId !== "string") {
    return NextResponse.json({ error: "UPI ID is required" }, { status: 400 });
  }

  const trimmed = upiId.trim().toLowerCase();
  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return NextResponse.json(
      { success: false, error: "Invalid UPI ID format. Expected format: name@bank" },
      { status: 400 }
    );
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.includes("xxxx")) {
    // Razorpay not configured — skip name verification
    return NextResponse.json({
      success: true,
      name: null,
      upiId: trimmed,
      verified: false,
    });
  }

  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/payments/validate/vpa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ vpa: trimmed }),
    });

    const data = await res.json();

    if (!res.ok || data.success === false) {
      return NextResponse.json(
        { success: false, error: "UPI ID not found. Please check and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      name: data.customer_name || data.name || null,
      upiId: trimmed,
      verified: true,
    });
  } catch (err) {
    console.error("Razorpay VPA validation error:", err);
    // If Razorpay is unreachable, allow saving without name verification
    return NextResponse.json({
      success: true,
      name: null,
      upiId: trimmed,
      verified: false,
    });
  }
}
