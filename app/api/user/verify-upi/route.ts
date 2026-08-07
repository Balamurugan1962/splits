import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { upiId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" });
  }

  const { upiId } = body;

  if (!upiId || typeof upiId !== "string") {
    return NextResponse.json({ success: false, error: "UPI ID is required" });
  }

  const trimmed = upiId.trim().toLowerCase();
  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return NextResponse.json({
      success: false,
      error: "Invalid UPI ID format. Expected: yourname@bank",
    });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // If Razorpay keys are not configured, skip name verification
  if (!keyId || !keySecret || keyId.includes("xxxx")) {
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
      // Return 200 with success:false — not HTTP 400 — so browser console stays clean
      return NextResponse.json({
        success: false,
        error: "UPI ID not found or invalid. Please check and try again.",
        upiId: trimmed,
        verified: false,
      });
    }

    return NextResponse.json({
      success: true,
      name: data.customer_name || data.name || null,
      upiId: trimmed,
      verified: true,
    });
  } catch (err) {
    console.error("Razorpay VPA validation error:", err);
    // Network error — allow saving without verification
    return NextResponse.json({
      success: true,
      name: null,
      upiId: trimmed,
      verified: false,
    });
  }
}
