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

  // If Razorpay keys are not configured or placeholder, skip name verification
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

    if (!res.ok) {
      // Endpoint deprecated or not enabled on Razorpay account — allow saving without name lookup
      return NextResponse.json({
        success: true,
        name: null,
        upiId: trimmed,
        verified: false,
      });
    }

    const data = await res.json();
    if (data.success === false) {
      return NextResponse.json({
        success: false,
        error: "UPI ID not found or invalid. Please check and try again.",
        upiId: trimmed,
        verified: false,
      });
    }

    const customerName = data.customer_name || data.name || data.vpa_name || null;

    return NextResponse.json({
      success: true,
      name: customerName,
      upiId: trimmed,
      verified: true,
    });
  } catch (err) {
    console.error("VPA validation error:", err);
    return NextResponse.json({
      success: true,
      name: null,
      upiId: trimmed,
      verified: false,
    });
  }
}
