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
    return d >= dateFrom && d <= dateTo;
  });

  const total = orders.length;
  const en_confirmation = orders.filter(o => matchState(o.order_state_name, "confirmation")).length;
  const en_preparation = orders.filter(o => matchState(o.order_state_name, "preparation")).length;
  const en_dispatch = orders.filter(o => matchState(o.order_state_name, "dispatch")).length;
  const en_livraison = orders.filter(o => matchState(o.order_state_name, "en livraison")).length;
  const livrees = orders.filter(o => {
  const s = (o.order_state_name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return s === "livree" || s === "encaissee";
}).length;
  const annulees = orders.filter(o => matchState(o.order_state_name, "annulee", "annule")).length;
  const retours = orders.filter(o => matchState(o.order_state_name, "retour")).length;
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const confirmed = orders.filter(o =>
    matchState(o.order_state_name, "preparation") ||
    matchState(o.order_state_name, "dispatch") ||
    matchState(o.order_state_name, "en livraison") ||
    ((o.order_state_name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === "livree")
  );
  const rate = total > 0 ? Math.round((confirmed.length / total) * 100) : 0;

  // Top produits
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

  // Top agents
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
    { label: "Total", value: total, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "En confirmation", value: en_confirmation, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "En préparation", value: en_preparation, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "En dispatch", value: en_dispatch, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "En livraison", value: en_livraison, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Livrées", value: livrees, color: "text-green-600", bg: "bg-green-50" },
    { label: "Annulées", value: annulees, color: "text-red-600", bg: "bg-red-50" },
    { label: "Retours", value: retours, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Taux conf.", value: `${rate}%`, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Revenue (DZD)", value: revenue.toLocaleString("fr-DZ"), color: "text-yellow-700", bg: "bg-yellow-50" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Vue d'ensemble</h2>
          <p className="text-sm text-gray-400 mt-1">Données en temps réel — EcoManager</p>
        </div>
        <div className="flex gap-2">
          {SHOPS.map((s) => (
            <button key={s.key} onClick={() => setShop(s.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                shop === s.key ? "bg-purple-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 bg-white border border-gray-100 rounded-xl p-4">
        <span className="text-sm text-gray-400">De :</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-purple-400" />
        <span className="text-sm text-gray-400">à</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-purple-400" />
        <div className="flex gap-2 ml-4">
          {[
            { label: "Aujourd'hui", from: today, to: today },
            { label: "7 jours", from: new Date(Date.now() - 7*864e5).toISOString().split("T")[0], to: today },
            { label: "Ce mois", from: today.substring(0,7)+"-01", to: today },
          ].map(preset => (
            <button key={preset.label}
              onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                dateFrom === preset.from && dateTo === preset.to
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-sm">Chargement...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {kpis.map((kpi) => (
              <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4`}>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{kpi.label}</div>
                <div className={`text-2xl font-medium ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-sm font-medium text-gray-900 mb-4">Top produits confirmés</div>
              {topProducts.length === 0 ? (
                <div className="text-xs text-gray-400">Aucune donnée</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-50">
                      <th className="text-left pb-2">Produit</th>
                      <th className="text-right pb-2">Qté</th>
                      <th className="text-right pb-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-700 truncate max-w-xs">{p.title}</td>
                        <td className="py-2 text-right font-medium text-purple-600">{p.count}</td>
                        <td className="py-2 text-right text-gray-500">{p.revenue.toLocaleString("fr-DZ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-sm font-medium text-gray-900 mb-4">Top agents — confirmation</div>
              {topAgents.length === 0 ? (
                <div className="text-xs text-gray-400">Aucune donnée</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-50">
                      <th className="text-left pb-2">Agent</th>
                      <th className="text-right pb-2">Confirmés/Total</th>
                      <th className="text-right pb-2">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAgents.map((a, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-700">{a.name}</td>
                        <td className="py-2 text-right text-gray-500">{a.confirmed}/{a.total}</td>
                        <td className="py-2 text-right">
                          <span className={`font-medium ${a.rate >= 70 ? "text-green-600" : a.rate >= 50 ? "text-yellow-600" : "text-red-500"}`}>
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