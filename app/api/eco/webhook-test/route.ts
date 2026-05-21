import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.log("WEBHOOK PAYLOAD:", JSON.stringify(body, null, 2));
  return NextResponse.json({ ok: true });
}