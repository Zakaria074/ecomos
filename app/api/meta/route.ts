import { NextRequest, NextResponse } from "next/server";

const AD_ACCOUNTS = [
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_1,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_2,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_3,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_4,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_5,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_6,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_7,
].filter(Boolean);

const ACCOUNT_NAMES: Record<string, string> = {
  "745840443692957": "SSST AD ACC",
  "1413439809464520": "DINO",
  "410685147751376": "Lucky account",
  "741883450881166": "WiaoxADS",
  "1712282372570163": "echri.shop",
  "537913345715869": "CHOCO",
  "1086046106163185": "108",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from") || new Date().toISOString().split("T")[0];
  const dateTo = searchParams.get("date_to") || dateFrom;
  const token = process.env.NEXT_PUBLIC_META_ACCESS_TOKEN;

  const results = await Promise.all(
    AD_ACCOUNTS.map(async (accountId) => {
      try {
        const [accountRes, campaignsRes, adsetsRes] = await Promise.all([
          fetch(
            `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&access_token=${token}`
          ),
          fetch(
            `https://graph.facebook.com/v19.0/act_${accountId}/insights?fields=campaign_name,campaign_id,spend,impressions,clicks,actions&time_range={"since":"${dateFrom}","until":"${dateTo}"}&level=campaign&access_token=${token}`
          ),
          fetch(
            `https://graph.facebook.com/v19.0/act_${accountId}/adsets?fields=campaign_id,daily_budget,status,effective_status&limit=100&access_token=${token}`
          ),
        ]);

        const accountData = await accountRes.json();
        const campaignsData = await campaignsRes.json();
        const adsetsData = await adsetsRes.json();

        // نجمع budget لكل campaign من adsets النشطة فقط
        const budgetMap: Record<string, number> = {};
        (adsetsData.data || []).forEach((a: { campaign_id: string; daily_budget?: string; status: string }) => {
          if (a.effective_status === "ACTIVE" && a.daily_budget) {
            budgetMap[a.campaign_id] = (budgetMap[a.campaign_id] || 0) + parseInt(a.daily_budget || "0") / 100;
          }
        });

        const campaigns = (campaignsData.data || []).map((c: any) => ({
          ...c,
          budget: { daily: budgetMap[c.campaign_id] || 0 },
        }));

        const totalDailyBudget = Object.values(budgetMap).reduce((s, b) => s + b, 0);

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