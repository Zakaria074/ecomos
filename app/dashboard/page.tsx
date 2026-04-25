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

interface DhdStats { expedies: number; en_livraison: number; livres: number; retours: number; }

function getDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().split("T")[0];
}

async function fetchDhdStats(token: string, dateFrom: string, dateTo: string): Promise<DhdStats> {
  const base = "https://platform.dhd-dz.com";
  let expedies = 0, en_livraison = 0, livres = 0, retours = 0;
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    try {
const res = await fetch(
  `${base}/api/v1/get/orders?api_token=${token}&page=${page}&start_date=${dateFrom}&end_date=${dateTo}`,
  { headers: { Accept: "application/json" } }
);
      const data = await res.json();
      const orders = data.data || [];
      if (orders.length === 0) { hasMore = false; break; }
      for (const o of orders) {
        const s = o.status || "";
        expedies++;
        if (s === "en_livraison") en_livraison++;
        else if (["livre_non_encaisse", "encaisse_non_paye", "paiements_prets", "paye_et_archive"].includes(s)) livres++;
        else if (["retour_chez_livreur", "retour_transit_entrepot", "retour_en_traitement", "retour_recu", "retour_archive"].includes(s)) retours++;
      }
      hasMore = !!data.next_page_url;
      page++;
    } catch { hasMore = false; }
  }
  return { expedies, en_livraison, livres, retours };
}

export default function DashboardPage() {
  const today = getDay(0);
  const yesterday = getDay(1);
  const last7 = getDay(6);
  const PRESETS = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: yesterday, to: yesterday },
    { label: "Last 7 days", from: last7, to: today },
  ];

  const [shop, setShop] = useState("GYMFORCE");
  const [dhd, setDhd] = useState<DhdStats>({ expedies: 0, en_livraison: 0, livres: 0, retours: 0 });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);
  const [activePreset, setActivePreset] = useState("Today");

  useEffect(() => {
    const dhdToken = DHD_TOKENS[shop];
    if (!dhdToken) return;
    setLoading(true);
    fetchDhdStats(dhdToken, appliedFrom, appliedTo).then((dhdData) => {
      setDhd(dhdData);
      setLoading(false);
    });
  }, [shop, appliedFrom, appliedTo]);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setDateFrom(p.from); setDateTo(p.to);
    setAppliedFrom(p.from); setAppliedTo(p.to);
    setActivePreset(p.label);
  };

  const handleValider = () => {
    const diff = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 864e5);
    if (diff > 7) { alert("Maximum 7 jours"); return; }
    setAppliedFrom(dateFrom); setAppliedTo(dateTo);
    setActivePreset("");
  };

  const dhdKpis = [
    { label: "Expédiés", value: dhd.expedies, color: "text-violet-600", border: "border-violet-100", icon: "🚀" },
    { label: "En livraison", value: dhd.en_livraison, color: "text-cyan-600", border: "border-cyan-100", icon: "🛵" },
    { label: "Livrés", value: dhd.livres, color: "text-green-600", border: "border-green-100", icon: "✅" },
    { label: "Retours", value: dhd.retours, color: "text-orange-500", border: "border-orange-100", icon: "↩️" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vue d'ensemble</h2>
          <p className="text-sm text-gray-400 mt-0.5">ECOTRACK — temps réel</p>
        </div>
        <div className="flex gap-2">
          {SHOPS.map(s => (
            <button key={s.key} onClick={() => setShop(s.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
                shop === s.key ? "bg-purple-600 text-white shadow-purple-200"
                : "bg-white border border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600"
              }`}>{s.name}</button>
          ))}
        </div>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Chargement des données...</p>
        </div>
      ) : (
        <>
          {/* ECOTRACK KPIs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ECOTRACK — Livraison</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {dhdKpis.map(kpi => (
                <div key={kpi.label} className={`bg-white border ${kpi.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">{kpi.label}</span>
                    <span className="text-base">{kpi.icon}</span>
                  </div>
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top produits — placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-semibold text-gray-900">Top produits</span>
              </div>
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <span className="text-3xl">📊</span>
                <p className="text-xs text-gray-400 text-center">Connexion Facebook Ads<br/>à venir</p>
                <span className="px-3 py-1 bg-blue-50 text-blue-500 text-xs rounded-lg font-medium">Bientôt disponible</span>
              </div>
            </div>

            {/* Today Ad Spend — placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💸</span>
                  <span className="text-sm font-semibold text-gray-900">Today Ad Spend</span>
                </div>
                <Link href="/dashboard/products"
                  className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors">
                  Voir détails →
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <p className="text-4xl font-bold text-gray-200">$0</p>
                <p className="text-xs text-gray-400 text-center">Meta & TikTok Ads<br/>à connecter</p>
                <span className="px-3 py-1 bg-orange-50 text-orange-500 text-xs rounded-lg font-medium">Non connecté</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}