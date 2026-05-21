import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "No date" }, { status: 400 });

  const from = `${date}T00:00:00.000Z`;
  const to   = `${date}T23:59:59.999Z`;

  const { count, error } = await supabase
    .from("eco_delivered")
    .select("*", { count: "exact", head: true })
    .gte("delivered_at", from)
    .lte("delivered_at", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ date, count: count ?? 0 });
}