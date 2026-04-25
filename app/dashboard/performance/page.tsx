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

interface CampaignRow {
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

function getResults(actions: { action_type: string; value: string }[] = []) {
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

export default function PerformancePage() {
  const today = getDay(0);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activePreset, setActivePreset] = useState("Today");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchMeta = async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meta?date_from=${from}&date_to=${to}`);
      const data: AccountData[] = await res.json();
      setAccounts(data);

      const parsed: CampaignRow[] = [];
      data.forEach(acc => {
        if (acc.campaigns.length === 0) return;
        acc.campaigns.forEach(c => {
          const spend = parseFloat(c.spend || "0");
          const impressions = parseInt(c.impressions || "0");
          const clicks = parseInt(c.clicks || "0");
          const results = getResults(c.actions);
          const cpr = results > 0 ? spend / results : 0;
          const cvr = clicks > 0 ? (results / clicks) * 100 : 0;
          parsed.push({
            accountId: acc.accountId,
            accountName: acc.accountName,
            campaignName: c.campaign_name,
            spend, impressions, clicks, results, cpr, cvr,
          });
        });
      });
      setRows(parsed);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchMeta(dateFrom, dateTo); }, []);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setDateFrom(p.from); setDateTo(p.to);
    setActivePreset(p.label);
    fetchMeta(p.from, p.to);
  };

  const handleValider = () => { setActivePreset(""); fetchMeta(dateFrom, dateTo); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...rows].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "asc" ? diff : -diff;
  });

  const totalSpend = accounts.reduce((s, a) => s + parseFloat(a.summary?.spend || "0"), 0);
  const totalResults = accounts.reduce((s, a) => s + getResults(a.summary?.actions), 0);
  const totalClicks = accounts.reduce((s, a) => s + parseInt(a.summary?.clicks || "0"), 0);
  const totalImpressions = accounts.reduce((s, a) => s + parseInt(a.summary?.impressions || "0"), 0);
  const totalCPR = totalResults > 0 ? totalSpend / totalResults : 0;
  const totalCVR = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;

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
          <p className="text-sm text-gray-400 mt-0.5">Meta Ads — données en temps réel</p>
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

      {/* KPIs + Account Boxes */}
      <div className="flex gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Total Spend</div>
            <div className="text-2xl font-bold text-blue-600">${totalSpend.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-green-100 rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Total Results</div>
            <div className="text-2xl font-bold text-green-600">{totalResults}</div>
          </div>
          <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Cost / Result</div>
            <div className="text-2xl font-bold text-purple-600">${totalCPR.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">CVR</div>
            <div className="text-2xl font-bold text-orange-500">{totalCVR.toFixed(1)}%</div>
          </div>
        </div>

        {/* Account Boxes */}
        <div className="flex flex-col gap-2 w-56">
          {accounts.map(acc => (
            <div key={acc.accountId} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{acc.accountName}</span>
              <span className="text-sm font-bold text-blue-600">${parseFloat(acc.summary?.spend || "0").toFixed(2)}</span>
            </div>
          ))}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total</span>
            <span className="text-sm font-bold text-gray-900">${totalSpend.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-semibold text-gray-900">Campagnes — par produit</span>
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
              <th className="text-left px-4 py-3 font-medium">Compte</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("spend")}>
                Spend <SortArrow k="spend" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("results")}>
                Results <SortArrow k="results" />
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("cpr")}>
                CPR <SortArrow k="cpr" />
              </th>
              <th className="text-right px-5 py-3 font-medium cursor-pointer" onClick={() => handleSort("cvr")}>
                CVR <SortArrow k="cvr" />
              </th>
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
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-300 text-xs">Aucune campagne</td>
              </tr>
            ) : (
              sorted.map((r, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 max-w-[260px] truncate">{r.campaignName}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.accountName}</td>
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
                <td className="px-4 py-3 text-right font-bold text-blue-600">${totalSpend.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">{totalResults}</td>
                <td className="px-4 py-3 text-right font-bold text-purple-600">${totalCPR.toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-bold text-orange-500">{totalCVR.toFixed(1)}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* TikTok placeholder */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm font-bold text-red-500">T</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">TikTok Ads</div>
              <div className="text-xs text-gray-400">Connexion à venir</div>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-orange-50 text-orange-500 rounded-lg font-medium">Bientôt disponible</span>
        </div>
      </div>
    </div>
  );
}