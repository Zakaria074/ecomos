"use client";

import { useEffect, useState } from "react";

const SHOPS = [
  { key: "LEKIDI", name: "Lekidi09" },
  { key: "DEGASTYLE", name: "DegaStyle" },
  { key: "GYMFORCE", name: "Gymforce" },
];

const TOKENS: Record<string, string | undefined> = {
  LEKIDI: process.env.NEXT_PUBLIC_ECOMANAGER_TOKEN_LEKIDI,
  DEGASTYLE: process.env.NEXT_PUBLIC_ECOMANAGER_TOKEN_DEGASTYLE,
  GYMFORCE: process.env.NEXT_PUBLIC_ECOMANAGER_TOKEN_GYMFORCE,
};

interface OrderItem {
  title: string;
  quantity: number;
  selling_price: number;
}

interface Order {
  id: number;
  order_state_name: string;
  total: number;
  total_shipping: number;
  created_at: string;
  confirmator: { id: number; name: string } | null;
  items: OrderItem[];
}

async function fetchAllOrders(token: string): Promise<Order[]> {
  const base = process.env.NEXT_PUBLIC_ECOMANAGER_URL;
  let all: Order[] = [];
  let url: string | null = `${base}/orders?per_page=100`;
  let pages = 0;
  while (url && pages < 60) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await res.json();
    all = [...all, ...(data.data || [])];
    url = data.links?.next || null;
    pages++;
  }
  return all;
}

function matchState(state: string, ...keywords: string[]): boolean {
  const s = (state || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return keywords.some(k => s.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
}

export default function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const [shop, setShop] = useState("GYMFORCE");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);

  useEffect(() => {
    const token = TOKENS[shop];
    if (!token) return;
    setLoading(true);
    fetchAllOrders(token).then((data) => {
      setAllOrders(data);
      setLoading(false);
    });
  }, [shop]);

  const orders = allOrders.filter((o) => {
    const d = o.created_at?.substring(0, 10);
    return d >= appliedFrom && d <= appliedTo;
  });

  const total = orders.length;
  const en_confirmation = orders.filter(o => matchState(o.order_state_name, "confirmation")).length;
  const en_preparation = orders.filter(o => matchState(o.order_state_name, "preparation")).length;
  const en_dispatch = orders.filter(o => matchState(o.order_state_name, "dispatch")).length;
  const en_livraison = orders.filter(o => matchState(o.order_state_name, "en livraison")).length;
  const livrees = orders.filter(o =>
    (matchState(o.order_state_name, "livree") && !matchState(o.order_state_name, "en livraison")) ||
    matchState(o.order_state_name, "encaisse")
  ).length;
  const annulees = orders.filter(o => matchState(o.order_state_name, "annulee", "annule")).length;
  const retours = orders.filter(o => matchState(o.order_state_name, "retour")).length;
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const confirmed = orders.filter(o =>
    matchState(o.order_state_name, "preparation") ||
    matchState(o.order_state_name, "dispatch") ||
    matchState(o.order_state_name, "en livraison") ||
    (matchState(o.order_state_name, "livree") && !matchState(o.order_state_name, "en livraison")) ||
    matchState(o.order_state_name, "encaisse")
  );
  const rate = total > 0 ? Math.round((confirmed.length / total) * 100) : 0;

  const productMap: Record<string, { title: string; count: number; revenue: number }> = {};
  confirmed.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.title || "Inconnu";
      if (!productMap[key]) productMap[key] = { title: key, count: 0, revenue: 0 };
      productMap[key].count += Number(item.quantity) || 1;
      productMap[key].revenue += Number(item.selling_price) * (Number(item.quantity) || 1);
    });
  });
  const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5);

  const agentMap: Record<string, { name: string; confirmed: number; total: number }> = {};
  orders.forEach(o => {
    if (!o.confirmator?.name) return;
    const name = o.confirmator.name;
    if (!agentMap[name]) agentMap[name] = { name, confirmed: 0, total: 0 };
    agentMap[name].total += 1;
    if (confirmed.find(c => c.id === o.id)) agentMap[name].confirmed += 1;
  });
  const topAgents = Object.values(agentMap)
    .map(a => ({ ...a, rate: Math.round((a.confirmed / a.total) * 100) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const kpis = [
    { label: "Total commandes", value: total, color: "text-purple-700", bg: "bg-white", border: "border-purple-100", icon: "📦" },
    { label: "En confirmation", value: en_confirmation, color: "text-yellow-600", bg: "bg-white", border: "border-yellow-100", icon: "⏳" },
    { label: "En préparation", value: en_preparation, color: "text-blue-600", bg: "bg-white", border: "border-blue-100", icon: "📋" },
    { label: "En dispatch", value: en_dispatch, color: "text-indigo-600", bg: "bg-white", border: "border-indigo-100", icon: "🚚" },
    { label: "En livraison", value: en_livraison, color: "text-cyan-600", bg: "bg-white", border: "border-cyan-100", icon: "🛵" },
    { label: "Livrées", value: livrees, color: "text-green-600", bg: "bg-white", border: "border-green-100", icon: "✅" },
    { label: "Annulées", value: annulees, color: "text-red-500", bg: "bg-white", border: "border-red-100", icon: "❌" },
    { label: "Retours", value: retours, color: "text-orange-500", bg: "bg-white", border: "border-orange-100", icon: "↩️" },
    { label: "Taux confirmation", value: `${rate}%`, color: rate >= 60 ? "text-green-600" : rate >= 40 ? "text-yellow-600" : "text-red-500", bg: "bg-white", border: "border-gray-100", icon: "📊" },
    { label: "Revenue (DZD)", value: revenue.toLocaleString("fr-DZ"), color: "text-yellow-700", bg: "bg-white", border: "border-yellow-100", icon: "💰" },
  ];

  const handleValider = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vue d'ensemble</h2>
          <p className="text-sm text-gray-400 mt-0.5">Données en temps réel — EcoManager</p>
        </div>
        <div className="flex gap-2">
          {SHOPS.map((s) => (
            <button key={s.key} onClick={() => setShop(s.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
                shop === s.key
                  ? "bg-purple-600 text-white shadow-purple-200"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600"
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <span className="text-sm text-gray-400 font-medium">De :</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50" />
        <span className="text-sm text-gray-400 font-medium">à</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50" />
        <div className="flex gap-2 ml-2">
          {[
            { label: "Aujourd'hui", from: today, to: today },
            { label: "7 jours", from: new Date(Date.now() - 7*864e5).toISOString().split("T")[0], to: today },
            { label: "Ce mois", from: today.substring(0,7)+"-01", to: today },
          ].map(preset => (
            <button key={preset.label}
              onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                appliedFrom === preset.from && appliedTo === preset.to
                  ? "bg-gray-900 text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}>
              {preset.label}
            </button>
          ))}
        </div>
        <button onClick={handleValider}
          className="px-5 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm shadow-purple-200 ml-auto">
          Valider
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-400 text-sm">Chargement des données...</div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">{kpi.label}</span>
                  <span className="text-lg">{kpi.icon}</span>
                </div>
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Tables */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top produits */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-semibold text-gray-900">Top produits confirmés</span>
              </div>
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <span className="text-3xl mb-2">📭</span>
                  <span className="text-xs">Aucune donnée</span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-3 font-medium">#</th>
                      <th className="text-left pb-3 font-medium">Produit</th>
                      <th className="text-right pb-3 font-medium">Qté</th>
                      <th className="text-right pb-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 text-gray-300 font-medium text-xs">#{i+1}</td>
                        <td className="py-2.5 text-gray-700 truncate max-w-[160px]">{p.title}</td>
                        <td className="py-2.5 text-right">
                          <span className="font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg text-xs">{p.count}</span>
                        </td>
                        <td className="py-2.5 text-right text-gray-500 text-xs">{p.revenue.toLocaleString("fr-DZ")} DZD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top agents */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">👥</span>
                <span className="text-sm font-semibold text-gray-900">Top agents — confirmation</span>
              </div>
              {topAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <span className="text-3xl mb-2">👤</span>
                  <span className="text-xs">Aucune donnée</span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-3 font-medium">#</th>
                      <th className="text-left pb-3 font-medium">Agent</th>
                      <th className="text-right pb-3 font-medium">Confirmés/Total</th>
                      <th className="text-right pb-3 font-medium">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAgents.map((a, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 text-gray-300 font-medium text-xs">#{i+1}</td>
                        <td className="py-2.5 text-gray-700 font-medium">{a.name}</td>
                        <td className="py-2.5 text-right text-gray-400 text-xs">{a.confirmed}/{a.total}</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-semibold text-xs px-2 py-0.5 rounded-lg ${
                            a.rate >= 70 ? "text-green-700 bg-green-50" :
                            a.rate >= 50 ? "text-yellow-700 bg-yellow-50" :
                            "text-red-600 bg-red-50"
                          }`}>
                            {a.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}