"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SHOPS = [
  { key: "LEKIDI", name: "Lekidi09" },
  { key: "DEGASTYLE", name: "DegaStyle" },
  { key: "GYMFORCE", name: "Gymforce" },
];

const DHD_TOKENS: Record<string, string | undefined> = {
  LEKIDI: process.env.NEXT_PUBLIC_DHD_TOKEN_LEKIDI,
  DEGASTYLE: process.env.NEXT_PUBLIC_DHD_TOKEN_DEGASTYLE,
  GYMFORCE: process.env.NEXT_PUBLIC_DHD_TOKEN_GYMFORCE,
};

interface DhdStats { expedies: number; en_livraison: number; }
interface AdSpend { tiktok: number; meta: number; total: number; results: number; cpr: number; }
interface TopCampaign { name: string; results: number; cpr: number; source: string; }

function getToday() { return new Date().toISOString().split("T")[0]; }

async function fetchDhdStats(token: string): Promise<DhdStats> {
  const base = "https://platform.dhd-dz.com";
  const today = getToday();
  let expedies = 0, en_livraison = 0;
  let page = 1, hasMore = true;
  while (hasMore) {
    try {
      const res = await fetch(`${base}/api/v1/get/orders?api_token=${token}&page=${page}&start_date=${today}&end_date=${today}`, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const orders = data.data || [];
      if (orders.length === 0) { hasMore = false; break; }
      for (const o of orders) {
        const s = o.status || "";
        expedies++;
        if (["en_ramassage","vers_hub","vers_station","en_station","vers_wilaya","en_preparation","en_livraison"].includes(s)) en_livraison++;
      }
      hasMore = !!data.next_page_url;
      page++;
    } catch { hasMore = false; }
  }
  return { expedies, en_livraison };
}

async function fetchAllShopsStats(): Promise<DhdStats> {
  const results = await Promise.all(SHOPS.map(async (shop) => {
    const token = DHD_TOKENS[shop.key];
    if (!token) return { expedies: 0, en_livraison: 0 };
    return fetchDhdStats(token);
  }));
  return results.reduce((all, s) => ({ expedies: all.expedies + s.expedies, en_livraison: all.en_livraison + s.en_livraison }), { expedies: 0, en_livraison: 0 });
}

async function fetchAdSpend(): Promise<{ spend: AdSpend; topCampaigns: TopCampaign[] }> {
  const today = getToday();
  let tiktok = 0, meta = 0, totalResults = 0;
  const allCampaigns: TopCampaign[] = [];
  try {
    const res = await fetch(`/api/tiktok?date_from=${today}&date_to=${today}`);
    const data = await res.json();
    tiktok = parseFloat(data.summary?.spend || "0");
    totalResults += parseInt(data.summary?.conversions || "0");
    for (const c of (data.campaigns || [])) {
      const cpr = parseFloat(c.cpc || "0");
      const results = parseInt(c.conversions || "0");
      if (results > 0 && cpr > 0) allCampaigns.push({ name: c.campaign_name, results, cpr, source: "TikTok" });
    }
  } catch {}
  try {
    const res = await fetch(`/api/meta?date_from=${today}&date_to=${today}`);
    const metaData: any[] = await res.json();
    for (const acc of metaData) {
      meta += parseFloat(acc.summary?.spend || "0");
      const accResults = acc.summary?.actions?.find((a: any) => ["purchase","omni_purchase","offsite_conversion.fb_pixel_purchase"].includes(a.action_type));
      totalResults += parseInt(accResults?.value || "0");
      for (const c of (acc.campaigns || [])) {
        const spend = parseFloat(c.spend || "0");
        const results = parseInt(c.actions?.find((a: any) => ["purchase","omni_purchase","offsite_conversion.fb_pixel_purchase"].includes(a.action_type))?.value || "0");
        const cpr = results > 0 ? spend / results : 0;
        if (results > 0 && cpr > 0) allCampaigns.push({ name: c.campaign_name, results, cpr, source: "Meta" });
      }
    }
  } catch {}
  const total = tiktok + meta;
  const cpr = totalResults > 0 ? total / totalResults : 0;
  return { spend: { tiktok, meta, total, results: totalResults, cpr }, topCampaigns: allCampaigns.sort((a, b) => a.cpr - b.cpr).slice(0, 3) };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DhdStats>({ expedies: 0, en_livraison: 0 });
  const [adSpend, setAdSpend] = useState<AdSpend>({ tiktok: 0, meta: 0, total: 0, results: 0, cpr: 0 });
  const [topCampaigns, setTopCampaigns] = useState<TopCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchAllShopsStats(), fetchAdSpend()]).then(([dhdData, spendData]) => {
      setStats(dhdData);
      setAdSpend(spendData.spend);
      setTopCampaigns(spendData.topCampaigns);
      setLastUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const costPerExpedie = stats.expedies > 0 ? adSpend.total / stats.expedies : 0;
  const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black text-gray-900">Vue d'ensemble</h2>
          <p className="text-xs text-gray-400 capitalize mt-0.5">{todayLabel}{lastUpdated && ` · ${lastUpdated}`}</p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95">
          <span className={`text-base ${loading ? "animate-spin" : ""}`}>🔄</span>
        </button>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2">
        <a href="https://platform.dhd-dz.com/home" target="_blank" rel="noreferrer"
          className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-2xl px-3 py-2.5 hover:bg-orange-100 transition-all active:scale-95">
          <span className="text-base">🚛</span>
          <span className="text-xs font-bold text-orange-600">DHD</span>
        </a>
        <a href="https://lekidi09.ecomanager.dz/fr/dash" target="_blank" rel="noreferrer"
          className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl px-3 py-2.5 hover:bg-blue-100 transition-all active:scale-95">
          <span className="text-base">🛒</span>
          <span className="text-xs font-bold text-blue-600">Ecomanager</span>
        </a>
        <Link href="/dashboard/calculator"
          className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-3 py-2.5 hover:bg-green-100 transition-all active:scale-95">
          <span className="text-base">🧮</span>
          <span className="text-xs font-bold text-green-600">Profit Calc</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3">
          <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-xs">Chargement...</p>
        </div>
      ) : (
        <>
          {/* Livraison */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"></span>
              Livraison aujourd'hui
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                  <span className="text-sm">📦</span>
                </div>
                <div className="text-3xl font-black text-violet-600">{stats.expedies}</div>
                <div className="text-xs text-gray-400 mt-1">Prêt + Expédiés</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expédiés</span>
                  <span className="text-sm">🚀</span>
                </div>
                <div className="text-3xl font-black text-cyan-600">{stats.en_livraison}</div>
                <div className="text-xs text-gray-400 mt-1">En livraison</div>
              </div>
            </div>
          </div>

          {/* Ads */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
              Publicités aujourd'hui
            </p>
            <div className="bg-gray-950 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Combined</span>
                <Link href="/dashboard/performance" className="text-xs text-purple-400 font-semibold">Détails →</Link>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Spend</div>
                  <div className="text-xl font-black text-white">${adSpend.total.toFixed(0)}</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    <span className="text-xs bg-pink-950 text-pink-400 px-1.5 py-0.5 rounded-lg font-bold">TK ${adSpend.tiktok.toFixed(0)}</span>
                    <span className="text-xs bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded-lg font-bold">FB ${adSpend.meta.toFixed(0)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Results</div>
                  <div className="text-xl font-black text-green-400">{adSpend.results}</div>
                  <div className="text-xs text-gray-600 mt-1">conversions</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">CPR</div>
                  <div className="text-xl font-black text-purple-400">${adSpend.cpr.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">par résultat</div>
                </div>
              </div>
              <div className="h-px bg-gray-800 mb-3"></div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost / Expédié</div>
                  <div className="text-xs text-gray-700 mt-0.5">${adSpend.total.toFixed(0)} ÷ {stats.expedies} colis</div>
                </div>
                <div className="text-2xl font-black text-yellow-400">${costPerExpedie.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Top Campagnes */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"></span>
              Top campagnes — meilleur CPR
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
              {topCampaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <span className="text-2xl">📊</span>
                  <p className="text-xs text-gray-400">Aucune conversion aujourd'hui</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {topCampaigns.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          i === 0 ? "bg-yellow-100 text-yellow-600" :
                          i === 1 ? "bg-gray-200 text-gray-600" :
                          "bg-orange-100 text-orange-500"
                        }`}>{i + 1}</div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 max-w-[130px] truncate">{c.name}</p>
                          <span className={`text-xs font-semibold ${c.source === "TikTok" ? "text-pink-500" : "text-blue-500"}`}>{c.source}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-green-600">{c.results} ventes</p>
                        <p className="text-xs text-gray-400">${c.cpr.toFixed(2)} CPR</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}