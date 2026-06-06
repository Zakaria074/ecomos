"use client";

import { useEffect, useState } from "react";
import { saveSetting, loadSetting } from "@/lib/supabase/settings";

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
  results: number;
  cpr: number;
}

type SortKey = "spend" | "results" | "cpr" | "profit";
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
  { label: "Last 3 days", from: getDay(3), to: getDay(1) },
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

export default function RiskManagementPage() {
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
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [dolarRate, setDolarRate] = useState(250);
  const [inputs, setInputs] = useState<Record<string, { prixVente: string; prixAchat: string }>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchAll = async (from: string, to: string) => {
    setLoadingMeta(true);
    setLoadingTT(true);
    const metaPromise = fetch(`/api/meta?date_from=${from}&date_to=${to}`)
      .then(r => r.json() as Promise<AccountData[]>)
      .then(data => { setAccounts(data); return data; })
      .catch(() => [] as AccountData[])
      .finally(() => setLoadingMeta(false));
    const ttPromise = fetch(`/api/tiktok?date_from=${from}&date_to=${to}`)
      .then(r => r.json() as Promise<TikTokData>)
      .then(data => { setTiktok(data); return data; })
      .catch(() => ({ summary: null, campaigns: [] } as TikTokData))
      .finally(() => setLoadingTT(false));
    const [metaData, ttData] = await Promise.all([metaPromise, ttPromise]);
    const parsed: CampaignRow[] = [];
    metaData.forEach(acc => {
      acc.campaigns.forEach(c => {
        const spend = parseFloat(c.spend || "0");
        const results = getMetaResults(c.actions);
        const cpr = results > 0 ? spend / results : 0;
        if (spend > 0.5) parsed.push({ source: "meta", accountId: acc.accountId, accountName: acc.accountName, campaignName: c.campaign_name, spend, results, cpr });
      });
    });
    ttData.campaigns?.forEach(c => {
      const spend = parseFloat(c.spend || "0");
      const results = parseInt(c.conversions || "0");
      const cpr = results > 0 ? spend / results : 0;
      if (spend > 0.5) parsed.push({ source: "tiktok", accountId: "tiktok", accountName: "TikTok Ads", campaignName: c.campaign_name, spend, results, cpr });
    });
    setRows(parsed);
  };

  useEffect(() => {
    const init = async () => {
      const savedInputs = await loadSetting("risk_inputs");
      const savedRate = await loadSetting("risk_dollar_rate");
      if (savedInputs) setInputs(savedInputs);
      if (savedRate) setDolarRate(savedRate);
      setDataLoaded(true);
    };
    init();
    fetchAll(dateFrom, dateTo);
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("risk_inputs", inputs);
  }, [inputs, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("risk_dollar_rate", dolarRate);
  }, [dolarRate, dataLoaded]);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setDateFrom(p.from); setDateTo(p.to);
    setActivePreset(p.label);
    setActiveAccount(null);
    fetchAll(p.from, p.to);
  };

  const handleValider = () => { setActivePreset(""); setActiveAccount(null); fetchAll(dateFrom, dateTo); };

  const getInput = (key: string) => inputs[key] || { prixVente: "", prixAchat: "" };

  const setInput = (key: string, field: "prixVente" | "prixAchat", value: string) => {
    setInputs(prev => ({ ...prev, [key]: { ...getInput(key), [field]: value } }));
  };

  const calcProfit = (row: CampaignRow) => {
    const inp = getInput(row.campaignName);
    const prixVente = parseFloat(inp.prixVente) || 0;
    const prixAchat = parseFloat(inp.prixAchat) || 0;
    if (!inp.prixVente && !inp.prixAchat) return null;
    const livrees = row.results * 0.42;
    if (livrees === 0) return null;
    const adCostPerUnit = (row.spend * dolarRate) / livrees;
    return (prixVente - prixAchat) - adCostPerUnit;
  };

  const filteredRows = rows
    .filter(r => {
      if (activeTab === "meta") return r.source === "meta";
      if (activeTab === "tiktok") return r.source === "tiktok";
      return true;
    })
    .filter(r => {
      if (activeAccount === "tiktok") return r.source === "tiktok";
      if (activeAccount) return r.accountId === activeAccount;
      return true;
    });

  const sorted = [...filteredRows].sort((a, b) => {
    if (sortKey === "profit") {
      const pa = calcProfit(a) ?? Infinity;
      const pb = calcProfit(b) ?? Infinity;
      return sortDir === "asc" ? pa - pb : pb - pa;
    }
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "asc" ? diff : -diff;
  });

  const dangerRows = sorted.filter(r => {
    const p = calcProfit(r);
    return p !== null && p < 200;
  });

  const hasAnyInput = sorted.some(r => {
    const inp = getInput(r.campaignName);
    return inp.prixVente || inp.prixAchat;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const fbSpend = accounts.reduce((s, a) => s + parseFloat(a.summary?.spend || "0"), 0);
  const fbResults = accounts.reduce((s, a) => s + getMetaResults(a.summary?.actions), 0);
  const ttSpend = parseFloat(tiktok.summary?.spend || "0");
  const ttResults = parseInt(tiktok.summary?.conversions || "0");
  const totalSpend = fbSpend + ttSpend;
  const totalResults = fbResults + ttResults;
  const totalCPR = totalResults > 0 ? totalSpend / totalResults : 0;
  const loading = loadingMeta || loadingTT;

  const SortArrow = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-gray-300 cursor-pointer select-none" onClick={() => handleSort(k)}>
      {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
    </span>
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Risk Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">Détectez les campagnes à risque avant qu'il soit trop tard</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2">
          <span className="text-sm">💵</span>
          <span className="text-xs font-bold text-amber-700">1$ =</span>
          <input type="number" value={dolarRate} onChange={e => setDolarRate(parseFloat(e.target.value) || 0)}
            className="w-16 text-sm font-black text-amber-700 bg-transparent border-none outline-none text-right" />
          <span className="text-xs font-bold text-amber-700">DZD</span>
        </div>
      </div>

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

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><MetaIcon size={14} /></div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Facebook</span>
            {loadingMeta && <div className="w-3 h-3 border border-blue-300 border-t-transparent rounded-full animate-spin ml-auto" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs text-gray-400 mb-1">Spend</div><div className="text-lg font-bold text-blue-600">${fbSpend.toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Results</div><div className="text-lg font-bold text-green-600">{fbResults}</div></div>
          </div>
        </div>
        <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600"><TikTokIcon size={14} /></div>
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide">TikTok</span>
            {loadingTT && <div className="w-3 h-3 border border-pink-300 border-t-transparent rounded-full animate-spin ml-auto" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-xs text-gray-400 mb-1">Spend</div><div className="text-lg font-bold text-pink-600">${ttSpend.toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Results</div><div className="text-lg font-bold text-green-600">{ttResults}</div></div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Combined</span>
            {loading && <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin ml-auto" />}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-xs text-gray-500 mb-1">Spend</div><div className="text-lg font-bold text-white">${totalSpend.toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-500 mb-1">Results</div><div className="text-lg font-bold text-green-400">{totalResults}</div></div>
            <div><div className="text-xs text-gray-500 mb-1">CPR</div><div className="text-lg font-bold text-purple-400">${totalCPR.toFixed(2)}</div></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {accounts.map(acc => (
          <div key={acc.accountId}
            onClick={() => setActiveAccount(activeAccount === acc.accountId ? null : acc.accountId)}
            className={`cursor-pointer border rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3 transition-all ${
              activeAccount === acc.accountId ? "border-blue-400 bg-blue-50" : "bg-white border-gray-100 hover:border-blue-200"
            }`}>
            <div className="w-5 h-5 text-blue-500"><MetaIcon size={14} /></div>
            <span className="text-xs font-medium text-gray-700">{acc.accountName}</span>
            <span className="text-sm font-bold text-blue-600">${parseFloat(acc.summary?.spend || "0").toFixed(2)}</span>
          </div>
        ))}
        {!loadingTT && !tiktok.error && (
          <div onClick={() => setActiveAccount(activeAccount === "tiktok" ? null : "tiktok")}
            className={`cursor-pointer border rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3 transition-all ${
              activeAccount === "tiktok" ? "border-pink-400 bg-pink-50" : "bg-white border-pink-100 hover:border-pink-300"
            }`}>
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

      {activeAccount && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtré par:</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
            activeAccount === "tiktok" ? "bg-pink-50 text-pink-600" : "bg-blue-50 text-blue-600"
          }`}>
            {activeAccount === "tiktok" ? "TikTok Ads" : accounts.find(a => a.accountId === activeAccount)?.accountName}
            <button onClick={() => setActiveAccount(null)} className="ml-1 hover:opacity-70">✕</button>
          </span>
        </div>
      )}

      {dangerRows.length > 0 && (
        <div className="bg-red-950 border border-red-900 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🚨</span>
            <span className="text-sm font-bold text-red-400 uppercase tracking-wide">Zone de Danger</span>
            <span className="ml-auto bg-red-900 text-red-300 text-xs font-bold px-2.5 py-1 rounded-lg">
              {dangerRows.length} campagne{dangerRows.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {dangerRows.map((r, i) => {
              const profit = calcProfit(r);
              const livrees = Math.round(r.results * 0.42);
              return (
                <div key={i} className="flex items-center justify-between bg-red-900/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${profit !== null && profit < 0 ? "bg-red-400" : "bg-orange-400"} animate-pulse`}></div>
                    <div>
                      <p className="text-xs font-bold text-red-200 max-w-[200px] truncate">{r.campaignName}</p>
                      <span className={`text-xs font-semibold ${r.source === "tiktok" ? "text-pink-400" : "text-blue-400"}`}>
                        {r.source === "meta" ? r.accountName : "TikTok"} · {livrees} livrées est.
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${profit !== null && profit < 0 ? "text-red-400" : "text-orange-400"}`}>
                      {profit !== null ? `${profit >= 0 ? "+" : ""}${profit.toFixed(0)} DZD` : "—"}
                    </p>
                    <p className="text-xs text-red-600">${r.spend.toFixed(2)} spend</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && dangerRows.length === 0 && hasAnyInput && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-green-700">Aucune campagne en danger</p>
            <p className="text-xs text-green-500">Toutes les campagnes sont au-dessus de 200 DZD/pièce</p>
          </div>
        </div>
      )}

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
          <p className="text-xs text-gray-400">Livrées = Results × 0.42</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Campagne</th>
                <th className="text-left px-3 py-3 font-medium">Prix vente</th>
                <th className="text-left px-3 py-3 font-medium">Prix achat</th>
                <th className="text-right px-3 py-3 font-medium">Livrées est.</th>
                <th className="text-right px-3 py-3 font-medium cursor-pointer" onClick={() => handleSort("profit")}>Profit/pièce <SortArrow k="profit" /></th>
                <th className="text-left px-3 py-3 font-medium">Source</th>
                <th className="text-right px-3 py-3 font-medium cursor-pointer" onClick={() => handleSort("spend")}>Spend <SortArrow k="spend" /></th>
                <th className="text-right px-3 py-3 font-medium cursor-pointer" onClick={() => handleSort("results")}>Results <SortArrow k="results" /></th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("cpr")}>CPR <SortArrow k="cpr" /></th>
                <th className="text-right px-3 py-3 font-medium">Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-300 text-xs">Aucune campagne</td></tr>
              ) : (
                sorted.map((r, i) => {
                  const profit = calcProfit(r);
                  const inp = getInput(r.campaignName);
                  const hasInput = inp.prixVente || inp.prixAchat;
                  const livrees = Math.round(r.results * 0.42);
                  const isDanger = profit !== null && profit < 200;
                  const isLoss = profit !== null && profit < 0;
                  return (
                    <tr key={i} className={`border-t border-gray-50 transition-colors ${isDanger ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate text-xs">
                        {isDanger && <span className="mr-1">⚠️</span>}
                        {r.campaignName}
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" placeholder="0" value={inp.prixVente}
                          onChange={e => setInput(r.campaignName, "prixVente", e.target.value)}
                          className="w-20 text-xs text-right border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400 focus:bg-violet-50 bg-gray-50 transition-all" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" placeholder="0" value={inp.prixAchat}
                          onChange={e => setInput(r.campaignName, "prixAchat", e.target.value)}
                          className="w-20 text-xs text-right border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400 focus:bg-violet-50 bg-gray-50 transition-all" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-semibold text-gray-600">{r.results > 0 ? livrees : "-"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {hasInput && profit !== null ? (
                          <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                            isLoss ? "bg-red-100 text-red-600" :
                            isDanger ? "bg-orange-100 text-orange-600" :
                            "bg-green-50 text-green-600"
                          }`}>
                            {profit >= 0 ? "+" : ""}{profit.toFixed(0)} DZD
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.source === "meta" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">
                            <MetaIcon size={10} /> {r.accountName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 text-xs font-medium">
                            <TikTokIcon size={10} /> TikTok
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold text-blue-600">${r.spend.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-xs font-semibold ${r.results > 0 ? "text-green-600" : "text-gray-300"}`}>{r.results || "-"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium ${r.cpr > 0 ? "text-purple-600" : "text-gray-300"}`}>
                          {r.cpr > 0 ? `$${r.cpr.toFixed(2)}` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
  {profit !== null && livrees > 0 ? (
    <span className={`text-xs font-black px-2 py-1 rounded-lg ${livrees * profit >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
      {(livrees * profit).toLocaleString()} DZD
    </span>
  ) : <span className="text-xs text-gray-300">—</span>}
</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
  <tr className="bg-gray-50 border-t-2 border-gray-200">
<td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total</td>
<td className="px-3 py-3 text-right text-xs font-bold text-gray-600">
  {sorted.reduce((s, r) => s + Math.round(r.results * 0.42), 0).toLocaleString()}
</td>
<td className="px-3 py-3"></td>
    <td className="px-3 py-3"></td>
    <td className="px-3 py-3 text-right text-xs font-bold text-blue-600">
      ${sorted.reduce((s, r) => s + r.spend, 0).toFixed(2)}
    </td>
    <td className="px-3 py-3 text-right text-xs font-bold text-green-600">
      {sorted.reduce((s, r) => s + r.results, 0)}
    </td>
    <td className="px-3 py-3"></td>
    <td className="px-3 py-3 text-right text-sm font-black text-green-600">
      {sorted.reduce((s, r) => {
        const profit = calcProfit(r);
        const livrees = Math.round(r.results * 0.42);
        return s + (profit !== null && livrees > 0 ? livrees * profit : 0);
      }, 0).toLocaleString()} DZD
    </td>
  </tr>
</tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}