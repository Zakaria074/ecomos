import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.order_state_id !== 5) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.from("eco_delivered").upsert({
    order_id: body.id,
    reference: body.reference,
    shop: body.reference?.startsWith("leki") ? "lekidi" : body.reference?.startsWith("deg") ? "degastyle" : "gymforce",
    full_name: body.full_name,
    wilaya: body.wilaya,
    commune: body.commune,
    tracking: body.tracking,
    delivered_at: new Date().toISOString(),
  }, { onConflict: "order_id" });

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}