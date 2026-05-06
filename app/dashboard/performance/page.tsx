"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Campaign {
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions: { action_type: string; value: string }[];
}

interface AccountData {
  accountId: string;
  accountName: string;
  summary: {
    spend: string;
    impressions: string;
    clicks: string;
    actions: { action_type: string; value: string }[];
  } | null;
  campaigns: Campaign[];
  error: null | { message: string };
}

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  cpc: string;
}

interface TikTokData {
  summary: {
    spend: string;
    impressions: string;
    clicks: string;
    conversions: string;
  } | null;
  campaigns: TikTokCampaign[];
  error?: string;
}

interface CampaignRow {
  source: "meta" | "tiktok";
  accountId: string;
  accountName: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cpr: number;
  cvr: number;
}

type SortKey = "spend" | "results" | "cpr" | "cvr" | "impressions" | "clicks";
type SortDir = "asc" | "desc";
type TabView = "all" | "meta" | "tiktok";

function getMetaResults(actions: { action_type: string; value: string }[] = []) {
  const r = actions?.find(a =>
    ["purchase", "omni_purchase", "web_in_store_purchase", "offsite_conversion.fb_pixel_purchase"].includes(a.action_type)
  );
  return parseInt(r?.value || "0");
}

function getDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().split("T")[0];
}

const PRESETS = [
  { label: "Today", from: getDay(0), to: getDay(0) },
  { label: "Yesterday", from: getDay(1), to: getDay(1) },
  { label: "Last 7 days", from: getDay(6), to: getDay(0) },
];

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" fill="currentColor"/>
    </svg>
  );
}

function MetaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06c0 5 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.89h-2.34v6.99C18.34 21.19 22 17.06 22 12.06c0-5.53-4.5-10.02-10-10.02z" fill="currentColor"/>
    </svg>
  );
}

export default function PerformancePage() {
  const today = getDay(0);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activePreset, setActivePreset] = useState("Today");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingTT, setLoadingTT] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [tiktok, setTiktok] = useState<TikTokData>({ summary: null, campaigns: [] });
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeTab, setActiveTab] = useState<TabView>("all");

  const fetchAll = async (from: string, to: string) => {
    setLoadingMeta(true);
    setLoadingTT(true);

    const metaPromise = fetch(`/api/meta?date_from=${from}&date_to=${to}`)
      .then(r => r.json() as Promise<AccountData[]>)
      .then(data => { setAccounts(data); return data; })
      .catch(e => { console.error("Meta error:", e); return [] as AccountData[]; })
      .finally(() => setLoadingMeta(false));

    const ttPromise = fetch(`/api/tiktok?date_from=${from}&date_to=${to}`)
      .then(r => r.json() as Promise<TikTokData>)
      .then(data => { setTiktok(data); return data; })
      .catch(e => { console.error("TikTok error:", e); return { summary: null, campaigns: [] } as TikTokData; })
      .finally(() => setLoadingTT(false));

    const [metaData, ttData] = await Promise.all([metaPromise, ttPromise]);

    const parsed: CampaignRow[] = [];

    metaData.forEach(acc => {
      acc.campaigns.forEach(c => {
        const spend = parseFloat(c.spend || "0");
        const impressions = parseInt(c.impressions || "0");
        const clicks = parseInt(c.clicks || "0");
        const results = getMetaResults(c.actions);
        const cpr = results > 0 ? spend / results : 0;
        const cvr = clicks > 0 ? (results / clicks) * 100 : 0;
        parsed.push({ source: "meta", accountId: acc.accountId, accountName: acc.accountName, campaignName: c.campaign_name, spend, impressions, clicks, results, cpr, cvr });
      });
    });

    ttData.campaigns?.forEach(c => {
      const spend = parseFloat(c.spend || "0");
      const impressions = parseInt(c.impressions || "0");
      const clicks = parseInt(c.clicks || "0");
      const results = parseInt(c.conversions || "0");
      const cpr = results > 0 ? spend / results : 0;
      const cvr = clicks > 0 ? (results / clicks) * 100 : 0;
      parsed.push({ source: "tiktok", accountId: "tiktok", accountName: "TikTok Ads", campaignName: c.campaign_name, spend, impressions, clicks, results, cpr, cvr });
    });

    setRows(parsed);
  };

  useEffect(() => { fetchAll(dateFrom, dateTo); }, []);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setDateFrom(p.from); setDateTo(p.to);
    setActivePreset(p.label);
    fetchAll(p.from, p.to);
  };

  const handleValider = () => { setActivePreset(""); fetchAll(dateFrom, dateTo); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filteredRows = rows.filter(r => {
    if (activeTab === "meta") return r.source === "meta";
    if (activeTab === "tiktok") return r.source === "tiktok";
    return true;
  });

  const sorted = [...filteredRows].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "asc" ? diff : -diff;
  });

  const fbSpend = accounts.reduce((s, a) => s + parseFloat(a.summary?.spend || "0"), 0);
  const fbResults = accounts.reduce((s, a) => s + getMetaResults(a.summary?.actions), 0);
  const fbClicks = accounts.reduce((s, a) => s + parseInt(a.summary?.clicks || "0"), 0);
  const fbCPR = fbResults > 0 ? fbSpend / fbResults : 0;

  const ttSpend = parseFloat(tiktok.summary?.spend || "0");
  const ttResults = parseInt(tiktok.summary?.conversions || "0");
  const ttClicks = parseInt(tiktok.summary?.clicks || "0");
  const ttCPR = ttResults > 0 ? ttSpend / ttResults : 0;

  const totalSpend = fbSpend + ttSpend;
  const totalResults = fbResults + ttResults;
  const totalClicks = fbClicks + ttClicks;
  const totalCPR = totalResults > 0 ? totalSpend / totalResults : 0;
  const totalCVR = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;

  const loading = loadingMeta || loadingTT;

  const SortArrow = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-gray-300 cursor-pointer select-none" onClick={() => handleSort(k)}>
      {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Performance & Rapports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Meta Ads + TikTok Ads — données en temps réel</p>
        </div>
        <Link href="/dashboard/performance/rapport"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="white" strokeWidth="1"/>
            <path d="M4 4h6M4 7h6M4 10h4" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          Rapport
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex-wrap">
        <div className="flex gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activePreset === p.label ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}>{p.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400" />
          <span className="text-gray-400">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400" />
          <button onClick={handleValider}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all">
            Valider
          </button>
        </div>
      </div>

      {/* 9 KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Facebook */}
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <MetaIcon size={14} />
            </div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Facebook</span>
            {loadingMeta && <div className="w-3 h-3 border border-blue-300 border-t-transparent rounded-full animate-spin ml-auto" />}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-400 mb-1">Spend</div>
              <div className="text-lg font-bold text-blue-600">${fbSpend.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Results</div>
              <div className="text-lg font-bold text-green-600">{fbResults}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">CPR</div>
              <div className="text-lg font-bold text-purple-600">${fbCPR.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* TikTok */}
        <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <TikTokIcon size={14} />
            </div>
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide">TikTok</span>
            {loadingTT && <div className="w-3 h-3 border border-pink-300 border-t-transparent rounded-full animate-spin ml-auto" />}
            {tiktok.error && <span className="text-xs text-red-400 ml-auto">Error</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-400 mb-1">Spend</div>
              <div className="text-lg font-bold text-pink-600">${ttSpend.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Results</div>
              <div className="text-lg font-bold text-green-600">{ttResults}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">CPR</div>
              <div className="text-lg font-bold text-purple-600">${ttCPR.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-900 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Combined</span>
            {loading && <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin ml-auto" />}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Spend</div>
              <div className="text-lg font-bold text-white">${totalSpend.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Results</div>
              <div className="text-lg font-bold text-green-400">{totalResults}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">CPR</div>
              <div className="text-lg font-bold text-purple-400">${totalCPR.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Boxes */}
      <div className="flex gap-2 flex-wrap">
        {accounts.map(acc => (
          <div key={acc.accountId} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3">
            <div className="w-5 h-5 text-blue-500"><MetaIcon size={14} /></div>
            <span className="text-xs font-medium text-gray-700">{acc.accountName}</span>
            <span className="text-sm font-bold text-blue-600">${parseFloat(acc.summary?.spend || "0").toFixed(2)}</span>
          </div>
        ))}
        {!loadingTT && !tiktok.error && (
          <div className="bg-white border border-pink-100 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3">
            <div className="w-5 h-5 text-pink-500"><TikTokIcon size={14} /></div>
            <span className="text-xs font-medium text-gray-700">TikTok Ads</span>
            <span className="text-sm font-bold text-pink-600">${ttSpend.toFixed(2)}</span>
          </div>
        )}
        <div className="bg-gray-900 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">Total</span>
          <span className="text-sm font-bold text-white">${totalSpend.toFixed(2)}</span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
              {(["all", "meta", "tiktok"] as TabView[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}>
                  {tab === "all" ? "Tout" : tab === "meta" ? "Facebook" : "TikTok"}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{sorted.length} campagnes</span>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              Chargement...
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Campagne</th>
              <th className="text-left px-4 py-3 font-medium">Source</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("spend")}>Spend <SortArrow k="spend" /></th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("results")}>Results <SortArrow k="results" /></th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("cpr")}>CPR <SortArrow k="cpr" /></th>
              <th className="text-right px-5 py-3 font-medium cursor-pointer" onClick={() => handleSort("cvr")}>CVR <SortArrow k="cvr" /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Chargement des campagnes...</span>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-300 text-xs">Aucune campagne</td></tr>
            ) : (
              sorted.map((r, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 max-w-[240px] truncate">{r.campaignName}</td>
                  <td className="px-4 py-3">
                    {r.source === "meta" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">
                        <MetaIcon size={11} /> Meta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 text-xs font-medium">
                        <TikTokIcon size={11} /> TikTok
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">${r.spend.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${r.results > 0 ? "text-green-600" : "text-gray-300"}`}>{r.results || "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${r.cpr > 0 ? "text-purple-600" : "text-gray-300"}`}>
                      {r.cpr > 0 ? `$${r.cpr.toFixed(2)}` : "-"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${r.cvr > 0 ? "text-orange-500" : "text-gray-300"}`}>
                      {r.cvr > 0 ? `${r.cvr.toFixed(1)}%` : "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && sorted.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-100 bg-gray-50">
                <td className="px-5 py-3 font-semibold text-gray-900" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">
                  ${filteredRows.reduce((s, r) => s + r.spend, 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  {filteredRows.reduce((s, r) => s + r.results, 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-purple-600">
                  ${(() => {
                    const s = filteredRows.reduce((a, r) => a + r.spend, 0);
                    const res = filteredRows.reduce((a, r) => a + r.results, 0);
                    return res > 0 ? (s / res).toFixed(2) : "0.00";
                  })()}
                </td>
                <td className="px-5 py-3 text-right font-bold text-orange-500">
                  {(() => {
                    const cl = filteredRows.reduce((a, r) => a + r.clicks, 0);
                    const res = filteredRows.reduce((a, r) => a + r.results, 0);
                    return cl > 0 ? `${((res / cl) * 100).toFixed(1)}%` : "0.0%";
                  })()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}