import { NextRequest, NextResponse } from "next/server";

const AD_ACCOUNTS = [
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_1,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_2,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_3,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_4,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_5,
].filter(Boolean);

const ACCOUNT_NAMES: Record<string, string> = {
  "745840443692957": "SSST AD ACC",
  "1413439809464520": "DINO",
  "410685147751376": "Lucky account",
  "741883450881166": "WiaoxADS",
  "1712282372570163": "echri.shop",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from") || new Date().toISOString().split("T")[0];
  const dateTo = searchParams.get("date_to") || dateFrom;
  const token = process.env.NEXT_PUBLIC_META_ACCESS_TOKEN;

  const results = await Promise.all(
    AD_ACCOUNTS.map(async (accountId) => {
      try {
        // إحصائيات الـ account الكاملة
        const [accountRes, campaignsRes, budgetRes] = await Promise.all([
          fetch(
            `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&access_token=${token}`
          ),
          fetch(
            `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=campaign_name,campaign_id,spend,impressions,clicks,actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&level=campaign&access_token=${token}`
          ),
          fetch(
            `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=name,id,daily_budget,lifetime_budget,status&access_token=${token}`
          ),
        ]);

        const accountData = await accountRes.json();
        const campaignsData = await campaignsRes.json();
        const budgetData = await budgetRes.json();

        // نربط الـ budget مع كل حملة
        const budgetMap: Record<string, { daily: number; lifetime: number; status: string }> = {};
        (budgetData.data || []).forEach((c: { id: string; daily_budget?: string; lifetime_budget?: string; status: string }) => {
          budgetMap[c.id] = {
            daily: parseInt(c.daily_budget || "0") / 100,
            lifetime: parseInt(c.lifetime_budget || "0") / 100,
            status: c.status,
          };
        });

        // نضيف الـ budget لكل حملة
        const campaigns = (campaignsData.data || []).map((c: { campaign_id: string; campaign_name: string }) => ({
          ...c,
          budget: budgetMap[c.campaign_id] || { daily: 0, lifetime: 0, status: "UNKNOWN" },
        }));

        // حساب الـ total budget
        const totalDailyBudget = Object.values(budgetMap).reduce((s, b) => s + b.daily, 0);

        return {
          accountId,
          accountName: ACCOUNT_NAMES[accountId!] || accountId,
          summary: accountData.data?.[0] || null,
          campaigns,
          totalDailyBudget,
          error: accountData.error || null,
        };
      } catch (e) {
        return {
          accountId,
          accountName: ACCOUNT_NAMES[accountId!] || accountId,
          summary: null,
          campaigns: [],
          totalDailyBudget: 0,
          error: e,
        };
      }
    })
  );

  return NextResponse.json(results);
}