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
  impressions: number;
  clicks: number;
  results: number;
  cpr: number;
  cvr: number;
}

type SortKey = "spend" | "results" | "cpr" | "cvr";
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

export default function PerformanceCalculatorPage() {
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
  const [calcInputs, setCalcInputs] = useState<Record<string, { prixVente: string; prixAchat: string; livrees: string }>>({});
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
        const impressions = parseInt(c.impressions || "0");
        const clicks = parseInt(c.clicks || "0");
        const results = getMetaResults(c.actions);
        const cpr = results > 0 ? spend / results : 0;
        const cvr = clicks > 0 ? (results / clicks) * 100 : 0;
        if (spend > 0.5) parsed.push({ source: "meta", accountId: acc.accountId, accountName: acc.accountName, campaignName: c.campaign_name, spend, impressions, clicks, results, cpr, cvr });
      });
    });
    ttData.campaigns?.forEach(c => {
      const spend = parseFloat(c.spend || "0");
      const impressions = parseInt(c.impressions || "0");
      const clicks = parseInt(c.clicks || "0");
      const results = parseInt(c.conversions || "0");
      const cpr = results > 0 ? spend / results : 0;
      const cvr = clicks > 0 ? (results / clicks) * 100 : 0;
      if (spend > 0.5) parsed.push({ source: "tiktok", accountId: "tiktok", accountName: "TikTok Ads", campaignName: c.campaign_name, spend, impressions, clicks, results, cpr, cvr });
    });
    setRows(parsed);
  };

  // Load from Supabase + fetch API
  useEffect(() => {
    const init = async () => {
      const savedInputs = await loadSetting("calc_inputs");
      const savedRate = await loadSetting("calc_dollar_rate");
      if (savedInputs) setCalcInputs(savedInputs);
      if (savedRate) setDolarRate(savedRate);
      setDataLoaded(true);
    };
    init();
    fetchAll(dateFrom, dateTo);
  }, []);

  // Auto-save inputs
  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("calc_inputs", calcInputs);
  }, [calcInputs, dataLoaded]);

  // Auto-save dollar rate
  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("calc_dollar_rate", dolarRate);
  }, [dolarRate, dataLoaded]);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setDateFrom(p.from); setDateTo(p.to);
    setActivePreset(p.label);
    setActiveAccount(null);
    fetchAll(p.from, p.to);
  };

  const handleValider = () => { setActivePreset(""); setActiveAccount(null); fetchAll(dateFrom, dateTo); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const getInput = (key: string) => calcInputs[key] || { prixVente: "", prixAchat: "", livrees: "" };

  const setInput = (key: string, field: "prixVente" | "prixAchat" | "livrees", value: string) => {
    setCalcInputs(prev => ({ ...prev, [key]: { ...getInput(key), [field]: value } }));
  };

  const calcProfitPerUnit = (row: CampaignRow) => {
    const inp = getInput(row.campaignName);
    const prixVente = parseFloat(inp.prixVente) || 0;
    const prixAchat = parseFloat(inp.prixAchat) || 0;
    const livrees = parseFloat(inp.livrees) || 0;
    if (!inp.prixVente && !inp.prixAchat && !inp.livrees) return null;
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
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "asc" ? diff : -diff;
  });

  const fbSpend = accounts.reduce((s, a) => s + parseFloat(a.summary?.spend || "0"), 0);
  const fbResults = accounts.reduce((s, a) => s + getMetaResults(a.summary?.actions), 0);
  const fbCPR = fbResults > 0 ? fbSpend / fbResults : 0;
  const ttSpend = parseFloat(tiktok.summary?.spend || "0");
  const ttResults = parseInt(tiktok.summary?.conversions || "0");
  const ttCPR = ttResults > 0 ? ttSpend / ttResults : 0;
  const totalSpend = fbSpend + ttSpend;
  const totalResults = fbResults + ttResults;
  const totalCPR = totalResults > 0 ? totalSpend / totalResults : 0;
  const loading = loadingMeta || loadingTT;

  const generatePDF = () => {
    const dateLabel = dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}`;
    const rowsWithData = sorted.map(r => {
      const inp = getInput(r.campaignName);
      const profit = calcProfitPerUnit(r);
      return { ...r, inp, profit };
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Rapport Performance — ${dateLabel}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family:'Segoe UI',sans-serif; background:#f8fafc; color:#1e293b; padding:28px; font-size:11px; }
    @page { margin: 1cm; }
  </style>
</head>
<body>
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);color:white;border-radius:14px;padding:24px 32px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">📊 Rapport Performance</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:3px;">EcomOS — Analyse des campagnes publicitaires</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;background:rgba(255,255,255,0.1);padding:5px 12px;border-radius:16px;display:inline-block;">${dateLabel}</div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:600;color:#92400e;display:inline-block;margin-top:6px;">💵 1$ = ${dolarRate} DZD</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px;">
    <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Total Ad Spend</div>
      <div style="font-size:20px;font-weight:800;color:#2563eb;">$${totalSpend.toFixed(2)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">FB $${fbSpend.toFixed(2)} · TK $${ttSpend.toFixed(2)}</div>
    </div>
    <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Total Results</div>
      <div style="font-size:20px;font-weight:800;color:#16a34a;">${totalResults}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">FB ${fbResults} · TK ${ttResults}</div>
    </div>
    <div style="background:#0f172a;border-radius:10px;padding:16px;border:1px solid #0f172a;">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b;margin-bottom:6px;">CPR Moyen</div>
      <div style="font-size:20px;font-weight:800;color:#a78bfa;">$${totalCPR.toFixed(2)}</div>
      <div style="font-size:10px;color:#475569;margin-top:4px;">${sorted.length} campagnes actives</div>
    </div>
  </div>
  <div style="background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#0f172a;">
      📋 Détail des campagnes &nbsp;<span style="font-size:11px;color:#94a3b8;font-weight:400;">${sorted.length} campagnes</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f8fafc;">
          ${["Campagne","Source","Spend","Results","CPR","Prix vente","Prix achat","Livrées","Profit/pièce"].map((h, i) =>
            `<th style="padding:9px 10px;text-align:${i >= 2 && i !== 5 && i !== 6 && i !== 7 ? "right" : "left"};font-size:9px;font-weight:600;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${h}</th>`
          ).join("")}
        </tr>
      </thead>
      <tbody>
        ${rowsWithData.map((r, i) => {
          const inp = r.inp;
          const profit = r.profit;
          const hasInput = inp.prixVente || inp.prixAchat || inp.livrees;
          const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
          return `
        <tr style="background:${bg};">
          <td style="padding:10px;font-size:11px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;max-width:160px;overflow:hidden;white-space:nowrap;">${r.campaignName}</td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;">
            <span style="display:inline-block;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600;background:${r.source === "meta" ? "#eff6ff" : "#fdf2f8"};color:${r.source === "meta" ? "#2563eb" : "#db2777"};">
              ${r.source === "meta" ? r.accountName : "TikTok"}
            </span>
          </td>
          <td style="padding:10px;text-align:right;font-size:11px;font-weight:600;color:#2563eb;border-bottom:1px solid #f1f5f9;">$${r.spend.toFixed(2)}</td>
          <td style="padding:10px;text-align:right;font-size:11px;font-weight:600;color:#16a34a;border-bottom:1px solid #f1f5f9;">${r.results || "-"}</td>
          <td style="padding:10px;text-align:right;font-size:11px;color:#7c3aed;border-bottom:1px solid #f1f5f9;">${r.cpr > 0 ? "$" + r.cpr.toFixed(2) : "-"}</td>
          <td style="padding:10px;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9;">${inp.prixVente ? inp.prixVente + " DZD" : "-"}</td>
          <td style="padding:10px;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9;">${inp.prixAchat ? inp.prixAchat + " DZD" : "-"}</td>
          <td style="padding:10px;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9;">${inp.livrees || "-"}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #f1f5f9;">
            ${hasInput && profit !== null
              ? `<span style="display:inline-block;padding:3px 7px;border-radius:5px;font-size:11px;font-weight:800;white-space:nowrap;background:${profit >= 0 ? "#f0fdf4" : "#fef2f2"};color:${profit >= 0 ? "#16a34a" : "#dc2626"};">${profit >= 0 ? "+" : ""}${profit.toFixed(0)} DZD</span>`
              : `<span style="display:inline-block;padding:3px 7px;border-radius:5px;font-size:10px;background:#f1f5f9;color:#94a3b8;white-space:nowrap;">غير محدد</span>`
            }
          </td>
        </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>
  <div style="margin-top:16px;text-align:center;font-size:11px;color:#94a3b8;">
    Généré par EcomOS • ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }
  };

  const SortArrow = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-gray-300 cursor-pointer select-none" onClick={() => handleSort(k)}>
      {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
    </span>
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Performance Calculator</h2>
          <p className="text-sm text-gray-400 mt-0.5">Calculez votre profit par campagne</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2">
            <span className="text-sm">💵</span>
            <span className="text-xs font-bold text-amber-700">1$ =</span>
            <input type="number" value={dolarRate} onChange={e => setDolarRate(parseFloat(e.target.value) || 0)}
              className="w-16 text-sm font-black text-amber-700 bg-transparent border-none outline-none text-right" />
            <span className="text-xs font-bold text-amber-700">DZD</span>
          </div>
          <button onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-all active:scale-95">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="white" strokeWidth="1"/>
              <path d="M4 4h6M4 7h6M4 10h4" stroke="white" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            Rapport
          </button>
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
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-xs text-gray-400 mb-1">Spend</div><div className="text-lg font-bold text-blue-600">${fbSpend.toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Results</div><div className="text-lg font-bold text-green-600">{fbResults}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">CPR</div><div className="text-lg font-bold text-purple-600">${fbCPR.toFixed(2)}</div></div>
          </div>
        </div>
        <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600"><TikTokIcon size={14} /></div>
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide">TikTok</span>
            {loadingTT && <div className="w-3 h-3 border border-pink-300 border-t-transparent rounded-full animate-spin ml-auto" />}
            {tiktok.error && <span className="text-xs text-red-400 ml-auto">Error</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><div className="text-xs text-gray-400 mb-1">Spend</div><div className="text-lg font-bold text-pink-600">${ttSpend.toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">Results</div><div className="text-lg font-bold text-green-600">{ttResults}</div></div>
            <div><div className="text-xs text-gray-400 mb-1">CPR</div><div className="text-lg font-bold text-purple-600">${ttCPR.toFixed(2)}</div></div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Campagne</th>
                <th className="text-left px-3 py-3 font-medium">Prix vente</th>
                <th className="text-left px-3 py-3 font-medium">Prix achat</th>
                <th className="text-left px-3 py-3 font-medium">Livrées</th>
                <th className="text-right px-3 py-3 font-medium">Profit/pièce</th>
                <th className="text-left px-3 py-3 font-medium">Source</th>
                <th className="text-right px-3 py-3 font-medium cursor-pointer" onClick={() => handleSort("spend")}>Spend <SortArrow k="spend" /></th>
                <th className="text-right px-3 py-3 font-medium cursor-pointer" onClick={() => handleSort("results")}>Results <SortArrow k="results" /></th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort("cpr")}>CPR <SortArrow k="cpr" /></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Chargement des campagnes...</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-300 text-xs">Aucune campagne</td></tr>
              ) : (
                sorted.map((r, i) => {
                  const profit = calcProfitPerUnit(r);
                  const inp = getInput(r.campaignName);
                  const isProfit = profit !== null && profit > 0;
                  const hasInput = inp.prixVente || inp.prixAchat || inp.livrees;
                  return (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate text-xs">{r.campaignName}</td>
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
                      <td className="px-3 py-2.5">
                        <input type="number" placeholder="0" value={inp.livrees}
                          onChange={e => setInput(r.campaignName, "livrees", e.target.value)}
                          className="w-16 text-xs text-right border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400 focus:bg-violet-50 bg-gray-50 transition-all" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {hasInput && profit !== null ? (
                          <span className={`text-xs font-black px-2 py-1 rounded-lg ${isProfit ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                            {isProfit ? "+" : ""}{profit.toFixed(0)} DZD
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}