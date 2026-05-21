import { NextRequest, NextResponse } from "next/server";

const ECO_BASE = "https://lekidi09.ecomanager.dz/api/shop/v2";
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "No date" }, { status: 400 });

  const ECO_TOKEN = process.env.NEXT_PUBLIC_ECOMANAGER_TOKEN_LEKIDI;
  if (!ECO_TOKEN) return NextResponse.json({ error: "No token" }, { status: 500 });

  let count = 0;
  let cursor: string | null = null;
  let page = 0;
  let stop = false;

  do {
    const url = new URL(`${ECO_BASE}/orders`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("sort_by", "updated_at");
    url.searchParams.set("sort_direction", "desc");
    if (cursor) url.searchParams.set("cursor", cursor);

    if (page > 0) await sleep(220);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${ECO_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const json = await res.json();
    const data: any[] = json.data ?? [];

    for (const order of data) {
      const orderDate = order.updated_at?.slice(0, 10);
      // وقف لما نوصل لتاريخ أقدم من المطلوب
      if (orderDate < date) { stop = true; break; }
      // عد فقط الموصلة في نفس اليوم
      if (orderDate === date && order.order_state_id === 5) count++;
    }

    cursor = json.meta?.next_cursor ?? null;
    page++;

    if (data.length === 0) break;

  } while (cursor && !stop);

  return NextResponse.json({ date, count });
}