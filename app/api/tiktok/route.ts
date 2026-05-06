import { NextRequest, NextResponse } from "next/server";

const TIKTOK_BASE = "https://business-api.tiktok.com";
const TIKTOK_TOKEN = process.env.TIKTOK_ACCESS_TOKEN!;
const AD_ACCOUNT_ID = process.env.TIKTOK_AD_ACCOUNT_ID || "7504969142957604880";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from") || new Date().toISOString().split("T")[0];
  const date_to = searchParams.get("date_to") || new Date().toISOString().split("T")[0];

  try {
    const campaignsRes = await fetch(
      `${TIKTOK_BASE}/open_api/v1.3/campaign/get/?advertiser_id=${AD_ACCOUNT_ID}&page_size=100`,
      { headers: { "Access-Token": TIKTOK_TOKEN, "Content-Type": "application/json" } }
    );
    const campaignsData = await campaignsRes.json();

    if (campaignsData.code !== 0) {
      return NextResponse.json({ error: campaignsData.message, code: campaignsData.code }, { status: 400 });
    }

    const campaigns = campaignsData.data?.list || [];
    const campaignMap: Record<string, string> = {};
    campaigns.forEach((c: any) => { campaignMap[c.campaign_id] = c.campaign_name; });

    if (campaigns.length === 0) {
      return NextResponse.json({ summary: { spend: "0", impressions: "0", clicks: "0", conversions: "0" }, campaigns: [] });
    }

    const dimensions = encodeURIComponent(JSON.stringify(["campaign_id"]));
    const metrics = encodeURIComponent(JSON.stringify(["spend", "impressions", "clicks", "conversion", "cost_per_conversion", "campaign_name"]));

    const statsRes = await fetch(
      `${TIKTOK_BASE}/open_api/v1.3/report/integrated/get/?advertiser_id=${AD_ACCOUNT_ID}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=${dimensions}&metrics=${metrics}&start_date=${date_from}&end_date=${date_to}&page_size=100`,
      {
        method: "GET",
        headers: { "Access-Token": TIKTOK_TOKEN, "Content-Type": "application/json" },
      }
    );

    const statsData = await statsRes.json();

    if (statsData.code !== 0) {
      return NextResponse.json({ error: statsData.message, code: statsData.code }, { status: 400 });
    }

    const statsRows = statsData.data?.list || [];
    const parsedCampaigns = statsRows.map((row: any) => {
      const m = row.metrics || {};
      const campaignId = row.dimensions?.campaign_id;
      return {
        campaign_id: campaignId,
        campaign_name: m.campaign_name || campaignMap[campaignId] || campaignId,
        spend: m.spend || "0",
        impressions: m.impressions || "0",
        clicks: m.clicks || "0",
        conversions: m.conversion || "0",
        cpc: m.cost_per_conversion || "0",
      };
    });

    const summary = parsedCampaigns.reduce(
      (acc: any, c: any) => ({
        spend: (parseFloat(acc.spend) + parseFloat(c.spend)).toFixed(2),
        impressions: String(parseInt(acc.impressions) + parseInt(c.impressions)),
        clicks: String(parseInt(acc.clicks) + parseInt(c.clicks)),
        conversions: String(parseInt(acc.conversions) + parseInt(c.conversions)),
      }),
      { spend: "0", impressions: "0", clicks: "0", conversions: "0" }
    );

    return NextResponse.json({ summary, campaigns: parsedCampaigns });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}