"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";

interface OrderRow {
  statut: string;
  sku: string;
  nomProduit: string;
  quantite: number;
  fraisLivreur: number;
  totalCommande: number;
  methode: string;
}

interface ProductSummary {
  sku: string;
  nomProduit: string;
  totalOrders: number;
  delivered: number;
  qte: number;
  sales: number;
  totalFrais: number;
  annulees: number;
  aDomicile: number;
  stopDesk: number;
}

interface ProductGroup {
  id: string;
  skus: string[];
  color: number;
}

interface Employee {
  id: string;
  name: string;
  val: number;
}

interface ExtraItem {
  id: string;
  label: string;
  val: number;
}

type SortKey = "delivered" | "totalOrders" | "sales" | "confRate" | "livRate" | "profits" | "roi" | "netPiece";

const SIMILAR_COLORS = [
  "border-l-2 border-l-purple-400",
  "border-l-2 border-l-blue-400",
  "border-l-2 border-l-orange-400",
  "border-l-2 border-l-pink-400",
  "border-l-2 border-l-teal-400",
  "border-l-2 border-l-red-400",
  "border-l-2 border-l-yellow-400",
];

const GROUPS_KEY = "ecomos_profit_groups";
const OPS_KEY = "ecomos_ops_state";

function loadGroups(): ProductGroup[] {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]"); } catch { return []; }
}
function saveGroups(g: ProductGroup[]) { localStorage.setItem(GROUPS_KEY, JSON.stringify(g)); }
function loadOpsState() {
  try { return JSON.parse(localStorage.getItem(OPS_KEY) || "null"); } catch { return null; }
}
function saveOpsState(s: any) { localStorage.setItem(OPS_KEY, JSON.stringify(s)); }

function getBase(name: string): string {
  return name.toLowerCase().replace(/[-_]?tik\s*$/i, "").replace(/\s+/g, " ").trim();
}

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Ayach", val: 46060 },
  { id: "e2", name: "Fares", val: 35365 },
  { id: "e3", name: "Abdou", val: 59550 },
  { id: "e4", name: "Raouf", val: 70395 },
  { id: "e5", name: "Mohcen", val: 39580 },
  { id: "e6", name: "Younes", val: 24500 },
  { id: "e7", name: "Hichem", val: 0 },
  { id: "e8", name: "Aymen", val: 39540 },
  { id: "e9", name: "Dino", val: 49710 },
  { id: "e10", name: "Zaki ayach", val: 17600 },
];

const DEFAULT_EXTRAS: ExtraItem[] = [
  { id: "x1", label: "زيادة 1", val: 10000 },
  { id: "x2", label: "زيادة 2", val: 5000 },
];

export default function ProfitPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const [dollarRate, setDollarRate] = useState(250);
  const [packaging, setPackaging] = useState(10);
  const [confirmedRate, setConfirmedRate] = useState(80);

  const [adsDollar, setAdsDollar] = useState<Record<string, number>>({});
  const [prixAchat, setPrixAchat] = useState<Record<string, number>>({});
  const [bonus, setBonus] = useState<Record<string, number>>({});

  const [sortKey, setSortKey] = useState<SortKey>("delivered");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [manualGroups, setManualGroups] = useState<ProductGroup[]>([]);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");

  const [opSalaries, setOpSalaries] = useState(382300);
  const [opCrm, setOpCrm] = useState(24500);
  const [opRent, setOpRent] = useState(74000);
  const [opUtilities, setOpUtilities] = useState(9060);
  const [opBonus, setOpBonus] = useState(5000);
  const [offTaqkid, setOffTaqkid] = useState(319);
  const [offSohfa, setOffSohfa] = useState(0);
  const [offTswiq, setOffTswiq] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [extras, setExtras] = useState<ExtraItem[]>(DEFAULT_EXTRAS);

  useEffect(() => {
    setManualGroups(loadGroups());
    const saved = loadOpsState();
    if (saved) {
      if (saved.opSalaries !== undefined) setOpSalaries(saved.opSalaries);
      if (saved.opCrm !== undefined) setOpCrm(saved.opCrm);
      if (saved.opRent !== undefined) setOpRent(saved.opRent);
      if (saved.opUtilities !== undefined) setOpUtilities(saved.opUtilities);
      if (saved.opBonus !== undefined) setOpBonus(saved.opBonus);
      if (saved.offTaqkid !== undefined) setOffTaqkid(saved.offTaqkid);
      if (saved.offSohfa !== undefined) setOffSohfa(saved.offSohfa);
      if (saved.offTswiq !== undefined) setOffTswiq(saved.offTswiq);
      if (saved.employees) setEmployees(saved.employees);
      if (saved.extras) setExtras(saved.extras);
      if (saved.dollarRate !== undefined) setDollarRate(saved.dollarRate);
      if (saved.packaging !== undefined) setPackaging(saved.packaging);
      if (saved.confirmedRate !== undefined) setConfirmedRate(saved.confirmedRate);
    }
  }, []);

  useEffect(() => {
    saveOpsState({ opSalaries, opCrm, opRent, opUtilities, opBonus, offTaqkid, offSohfa, offTswiq, employees, extras, dollarRate, packaging, confirmedRate });
  }, [opSalaries, opCrm, opRent, opUtilities, opBonus, offTaqkid, offSohfa, offTswiq, employees, extras, dollarRate, packaging, confirmedRate]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: "" });
    const orders: OrderRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const statut = String(r[6] || "").trim();
      if (!statut) continue;
      orders.push({
        statut,
        sku: String(r[16] || "").trim(),
        nomProduit: String(r[17] || "").trim(),
        quantite: Number(r[19]) || 1,
        // AB = index 27 (A=0, B=1, ... Z=25, AA=26, AB=27)
        fraisLivreur: Number(r[27]) || 0,
        totalCommande: Number(r[28]) || 0,
        methode: String(r[5] || "").trim(),
      });
    }
    const map: Record<string, ProductSummary> = {};
    orders.forEach(o => {
      const key = o.sku || o.nomProduit;
      if (!map[key]) map[key] = { sku: o.sku, nomProduit: o.nomProduit, totalOrders: 0, delivered: 0, qte: 0, sales: 0, totalFrais: 0, annulees: 0, aDomicile: 0, stopDesk: 0 };
      map[key].totalOrders += 1;
      if (o.statut.toLowerCase().includes("annul")) map[key].annulees += 1;
      if (o.statut === "Encaissée" || o.statut === "Livrée") {
        map[key].delivered += 1;
        map[key].qte += o.quantite;
        map[key].sales += o.totalCommande;
        map[key].totalFrais += o.fraisLivreur;
        if (o.methode.toLowerCase().includes("domicile")) map[key].aDomicile += 1;
        if (o.methode.toLowerCase().includes("stop")) map[key].stopDesk += 1;
      }
    });
    setProducts(Object.values(map).filter(p => p.totalOrders > 0));
    setLoading(false);
  };

  const fmt = (n: number, dec = 0) => n.toLocaleString("fr-DZ", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const pct = (n: number) => `${fmt(n, 1)}%`;

  const calcProduct = (p: ProductSummary) => {
    const mouwakkada = p.totalOrders - p.annulees;
    const confRate = p.totalOrders > 0 ? (mouwakkada / p.totalOrders) * 100 : 0;
    const livRate = mouwakkada > 0 ? (p.delivered / mouwakkada) * 100 : 0;
    const adsDzd = (adsDollar[p.sku] || 0) * dollarRate;
    const packagingTotal = p.delivered * packaging;
    const prixAchatTotal = (prixAchat[p.sku] || 0) * p.qte;
    const mouwakkadaTotal = p.delivered * confirmedRate;
    const bonusTotal = bonus[p.sku] || 0;
    const total = adsDzd + packagingTotal + prixAchatTotal + mouwakkadaTotal + bonusTotal + p.totalFrais;
    const profits = p.sales - total;
    const roi = p.sales > 0 ? (profits / p.sales) * 100 : 0;
    const cPerLead = p.totalOrders > 0 ? (adsDollar[p.sku] || 0) / p.totalOrders : 0;
    const cPerDelivered = p.delivered > 0 ? (adsDollar[p.sku] || 0) / p.delivered : 0;
    const netPiece = p.delivered > 0 ? profits / p.delivered : 0;
    const domicilePct = p.delivered > 0 ? (p.aDomicile / p.delivered) * 100 : 0;
    const stopDeskPct = p.delivered > 0 ? (p.stopDesk / p.delivered) * 100 : 0;
    return { confRate, livRate, mouwakkada, mouwakkadaTotal, adsDzd, packagingTotal, prixAchatTotal, total, profits, roi, cPerLead, cPerDelivered, netPiece, domicilePct, stopDeskPct };
  };

  const totalOpsFixed = opSalaries + opCrm + opRent + opUtilities + opBonus;
  const totalOpsVar = offTaqkid + offSohfa + offTswiq;
  const totalEmpSalaries = employees.reduce((s, e) => s + e.val, 0);
  const totalOperations = totalOpsFixed + totalOpsVar + totalEmpSalaries;
  const totalExtras = extras.reduce((s, e) => s + e.val, 0);
  const grandTotalOps = totalOperations + totalExtras;

  const totalProductProfit = products.reduce((s, p) => s + calcProduct(p).profits, 0);
  const netProfitAfterOps = totalProductProfit - grandTotalOps;
  const totalSales = products.reduce((s, p) => s + p.sales, 0);
  const totalAds = Object.values(adsDollar).reduce((s, v) => s + v, 0);
  const produitsActifs = products.filter(p => p.delivered >= 5).length;
  const totalDomicile = products.reduce((s, p) => s + p.aDomicile, 0);
  const totalStopDesk = products.reduce((s, p) => s + p.stopDesk, 0);
  const totalDelivered = products.reduce((s, p) => s + p.delivered, 0);
  const totalOrders = products.reduce((s, p) => s + p.totalOrders, 0);

  // Top 5 par profits
  const top5 = useMemo(() => {
    return [...products]
      .map(p => ({ ...p, profits: calcProduct(p).profits }))
      .sort((a, b) => b.profits - a.profits)
      .slice(0, 5);
  }, [products, adsDollar, prixAchat, bonus, dollarRate, packaging, confirmedRate]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const saveGroup = () => {
    if (selectedSkus.length < 2) return;
    const colorIdx = manualGroups.length % SIMILAR_COLORS.length;
    const cleaned = manualGroups.map(g => ({ ...g, skus: g.skus.filter(s => !selectedSkus.includes(s)) })).filter(g => g.skus.length > 1);
    const newGroup: ProductGroup = { id: Date.now().toString(), skus: selectedSkus, color: colorIdx };
    const updated = [...cleaned, newGroup];
    saveGroups(updated);
    setManualGroups(updated);
    setShowGroupPanel(false);
    setSelectedSkus([]);
    setGroupSearch("");
  };

  const removeGroup = (id: string) => {
    const updated = manualGroups.filter(g => g.id !== id);
    saveGroups(updated);
    setManualGroups(updated);
  };

  const getSkuColor = (sku: string, allProducts: ProductSummary[]): number | undefined => {
    const manualGroup = manualGroups.find(g => g.skus.includes(sku));
    if (manualGroup) return manualGroup.color;
    const p = allProducts.find(x => x.sku === sku);
    if (!p) return undefined;
    const base = getBase(p.nomProduit);
    const hasSibling = allProducts.some(q => getBase(q.nomProduit) === base && q.sku !== sku);
    if (!hasSibling) return undefined;
    let hash = 0;
    for (let i = 0; i < base.length; i++) hash = base.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % SIMILAR_COLORS.length;
  };

  const sortedProducts = useMemo(() => {
    const filtered = products.filter(p =>
      p.nomProduit.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      const ca = calcProduct(a);
      const cb = calcProduct(b);
      const map: Record<SortKey, number> = {
        delivered: a.delivered - b.delivered,
        totalOrders: a.totalOrders - b.totalOrders,
        sales: a.sales - b.sales,
        confRate: ca.confRate - cb.confRate,
        livRate: ca.livRate - cb.livRate,
        profits: ca.profits - cb.profits,
        roi: ca.roi - cb.roi,
        netPiece: ca.netPiece - cb.netPiece,
      };
      return sortAsc ? map[sortKey] : -map[sortKey];
    });
    const result: ProductSummary[] = [];
    const addedSkus = new Set<string>();
    sorted.forEach(p => {
      if (addedSkus.has(p.sku)) return;
      const manualGroup = manualGroups.find(g => g.skus.includes(p.sku));
      if (manualGroup) {
        manualGroup.skus.forEach(sku => {
          const prod = sorted.find(x => x.sku === sku);
          if (prod && !addedSkus.has(sku)) { result.push(prod); addedSkus.add(sku); }
        });
        return;
      }
      const base = getBase(p.nomProduit);
      const siblings = sorted.filter(q => getBase(q.nomProduit) === base && !addedSkus.has(q.sku));
      siblings.forEach(q => { result.push(q); addedSkus.add(q.sku); });
    });
    return result;
  }, [products, sortKey, sortAsc, search, manualGroups, adsDollar, prixAchat, bonus, dollarRate, packaging, confirmedRate]);

  const filteredForGroup = products.filter(p =>
    p.nomProduit.toLowerCase().includes(groupSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const Th = ({ label, sk, right = true }: { label: string; sk?: SortKey; right?: boolean }) => (
    <th onClick={() => sk && handleSort(sk)}
      className={`px-3 py-3 font-medium text-gray-500 whitespace-nowrap ${right ? "text-right" : "text-left"} ${sk ? "cursor-pointer hover:text-purple-600 select-none" : ""}`}>
      {label}{sk ? (sortKey === sk ? (sortAsc ? " ↑" : " ↓") : " ↕") : ""}
    </th>
  );

  const F = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 truncate">{label}</span>
      <input type="number" value={value || ""}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="w-full border border-gray-100 rounded-lg px-2 py-1 text-xs text-right text-gray-700 bg-white focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100" />
    </div>
  );

  const medalColors = ["text-yellow-500", "text-gray-400", "text-orange-400", "text-gray-500", "text-gray-500"];
  const medals = ["🥇", "🥈", "🥉", "4", "5"];

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Profit & Loss</h2>
          <p className="text-sm text-gray-400 mt-0.5">Analyse de rentabilité par produit</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-2xl text-sm font-medium cursor-pointer hover:bg-purple-700 transition-all shadow-sm shadow-purple-200">
          📂 {fileName || "Importer Excel"}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* ROW 1: Operations panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Operations</p>
          <span className="text-xs font-bold text-purple-600 tabular-nums">{fmt(grandTotalOps)} DZD</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Coûts fixes</p>
            <div className="grid grid-cols-6 gap-3">
              <F label="1$ = DZD"    value={dollarRate}    onChange={setDollarRate} />
              <F label="Tağlîf"      value={packaging}     onChange={setPackaging} />
              <F label="Conf./livré" value={confirmedRate} onChange={setConfirmedRate} />
              <F label="Salaries"    value={opSalaries}    onChange={setOpSalaries} />
              <F label="Service CRM" value={opCrm}         onChange={setOpCrm} />
              <F label="Rent"        value={opRent}        onChange={setOpRent} />
              <F label="Utilities"   value={opUtilities}   onChange={setOpUtilities} />
              <F label="Bonus"       value={opBonus}       onChange={setOpBonus} />
              <F label="تأكيد مكتب"  value={offTaqkid}     onChange={setOffTaqkid} />
              <F label="صفحة"        value={offSohfa}      onChange={setOffSohfa} />
              <F label="تسويق"       value={offTswiq}      onChange={setOffTswiq} />
              <div className="flex flex-col gap-0.5 justify-end">
                <span className="text-[10px] text-gray-400">Total fixes</span>
                <div className="bg-gray-50 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 text-right border border-gray-100 tabular-nums">
                  {fmt(totalOpsFixed + totalOpsVar)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-4">
            {/* Salaires */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Salaires</p>
                <span className="text-[10px] text-gray-400 tabular-nums">{fmt(totalEmpSalaries)} DZD</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-1">
                    <input type="text" value={emp.name}
                      onChange={e => setEmployees(prev => prev.map(x => x.id === emp.id ? { ...x, name: e.target.value } : x))}
                      className="w-14 min-w-0 border border-gray-100 rounded-lg px-1.5 py-1 text-[11px] text-gray-700 bg-gray-50 focus:outline-none focus:border-purple-300" />
                    <input type="number" value={emp.val || ""}
                      onChange={e => setEmployees(prev => prev.map(x => x.id === emp.id ? { ...x, val: Number(e.target.value) || 0 } : x))}
                      placeholder="0"
                      className="flex-1 min-w-0 border border-gray-100 rounded-lg px-1.5 py-1 text-[11px] text-right text-gray-700 bg-gray-50 focus:outline-none focus:border-purple-300" />
                    <button onClick={() => setEmployees(prev => prev.filter(x => x.id !== emp.id))}
                      className="text-gray-200 hover:text-red-400 text-sm leading-none">×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setEmployees(prev => [...prev, { id: Date.now().toString(), name: "", val: 0 }])}
                className="mt-2 w-full border border-dashed border-gray-200 rounded-lg py-1 text-[11px] text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all">
                + موظف
              </button>
            </div>

            {/* زيادات */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">زيادات</p>
                <span className="text-[10px] text-gray-400 tabular-nums">{fmt(totalExtras)} DZD</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {extras.map(ex => (
                  <div key={ex.id} className="flex items-center gap-1">
                    <input type="text" value={ex.label}
                      onChange={e => setExtras(prev => prev.map(x => x.id === ex.id ? { ...x, label: e.target.value } : x))}
                      placeholder="اسم"
                      className="w-14 min-w-0 border border-gray-100 rounded-lg px-1.5 py-1 text-[11px] text-gray-700 bg-gray-50 focus:outline-none focus:border-purple-300" />
                    <input type="number" value={ex.val || ""}
                      onChange={e => setExtras(prev => prev.map(x => x.id === ex.id ? { ...x, val: Number(e.target.value) || 0 } : x))}
                      placeholder="0"
                      className="flex-1 min-w-0 border border-gray-100 rounded-lg px-1.5 py-1 text-[11px] text-right text-gray-700 bg-gray-50 focus:outline-none focus:border-purple-300" />
                    <button onClick={() => setExtras(prev => prev.filter(x => x.id !== ex.id))}
                      className="text-gray-200 hover:text-red-400 text-sm leading-none">×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setExtras(prev => [...prev, { id: Date.now().toString(), label: "", val: 0 }])}
                className="mt-2 w-full border border-dashed border-gray-200 rounded-lg py-1 text-[11px] text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all">
                + زيادة
              </button>
            </div>

            {/* Stats */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Statistiques</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Total ops", val: `${fmt(totalOperations)} DZD` },
                  { label: "Cost/opération", val: totalOrders > 0 ? `${fmt(totalOperations / totalOrders)} DZD` : "—" },
                  { label: "Avg C/lead $", val: dollarRate > 0 && totalOrders > 0 ? `$${(totalOperations / dollarRate / totalOrders).toFixed(2)}` : "—" },
                  { label: "Avg C/livré $", val: dollarRate > 0 && totalDelivered > 0 ? `$${(totalOperations / dollarRate / totalDelivered).toFixed(2)}` : "—" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                    <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5 tabular-nums">{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between bg-purple-50 rounded-xl px-3 py-2 border border-purple-100">
                <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-widest">Grand Total</span>
                <span className="text-sm font-bold text-purple-600 tabular-nums">{fmt(grandTotalOps)} DZD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: 6 stat cards + Top 5 */}
      <div className="grid grid-cols-7 gap-3">
        {/* Net Profit */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-1">Net Profit</p>
          <p className={`text-lg font-bold pl-3 tabular-nums leading-tight ${netProfitAfterOps >= 0 ? "text-emerald-500" : "text-red-500"}`}>{fmt(netProfitAfterOps)}</p>
          <p className="text-[10px] text-gray-400 pl-3 mt-1">÷2 = {fmt(netProfitAfterOps / 2)}</p>
        </div>
        {/* Ventes */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-1">Ventes</p>
          <p className="text-lg font-bold text-blue-500 pl-3 tabular-nums leading-tight">{fmt(totalSales)}</p>
          <p className="text-[10px] text-gray-400 pl-3 mt-1">DZD</p>
        </div>
        {/* Ads */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-orange-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-1">Total Ads</p>
          <p className="text-lg font-bold text-orange-500 pl-3 tabular-nums leading-tight">${fmt(totalAds, 2)}</p>
          <p className="text-[10px] text-gray-400 pl-3 mt-1">= {fmt(totalAds * dollarRate)} DZD</p>
        </div>
        {/* Produits actifs */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-violet-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-1">Produits actifs</p>
          <p className="text-lg font-bold text-violet-500 pl-3 tabular-nums leading-tight">{produitsActifs}</p>
          <p className="text-[10px] text-gray-400 pl-3 mt-1">+5 livraisons</p>
        </div>
        {/* Domicile */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-teal-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-1">À domicile</p>
          <p className="text-lg font-bold text-teal-500 pl-3 tabular-nums leading-tight">{totalDomicile}</p>
          <p className="text-[10px] text-gray-400 pl-3 mt-1">{totalDelivered > 0 ? pct((totalDomicile / totalDelivered) * 100) : "—"}</p>
        </div>
        {/* Stop desk */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-indigo-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-1">Stop desk</p>
          <p className="text-lg font-bold text-indigo-500 pl-3 tabular-nums leading-tight">{totalStopDesk}</p>
          <p className="text-[10px] text-gray-400 pl-3 mt-1">{totalDelivered > 0 ? pct((totalStopDesk / totalDelivered) * 100) : "—"}</p>
        </div>

        {/* Top 5 */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-yellow-400 rounded-l-2xl" />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pl-3 mb-2">Top 5</p>
          {products.length === 0 ? (
            <p className="text-[10px] text-gray-300 pl-3">—</p>
          ) : (
            <div className="space-y-1.5 pl-3">
              {top5.map((p, i) => (
                <div key={p.sku} className="flex items-center gap-1.5">
                  <span className="text-sm leading-none">{medals[i]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-700 truncate leading-tight">{p.nomProduit}</p>
                    <p className={`text-[10px] tabular-nums leading-tight ${p.profits >= 0 ? "text-emerald-500" : "text-red-400"}`}>{fmt(p.profits)} DZD</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 gap-3">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Lecture du fichier...</span>
        </div>
      )}

      {showGroupPanel && (
        <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Grouper des produits</div>
            <button onClick={() => { setShowGroupPanel(false); setSelectedSkus([]); setGroupSearch(""); }}
              className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <input type="text" placeholder="Rechercher produit..." value={groupSearch}
            onChange={e => setGroupSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-400" />
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredForGroup.map(p => (
              <label key={p.sku} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedSkus.includes(p.sku)}
                  onChange={e => {
                    if (e.target.checked) setSelectedSkus(prev => [...prev, p.sku]);
                    else setSelectedSkus(prev => prev.filter(s => s !== p.sku));
                  }}
                  className="accent-purple-600" />
                <span className="text-sm text-gray-700">{p.nomProduit}</span>
                <span className="text-xs text-gray-400 ml-auto">{p.sku}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{selectedSkus.length} produit(s) sélectionné(s)</span>
            <button onClick={saveGroup} disabled={selectedSkus.length < 2}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-700 transition-all">
              Grouper
            </button>
          </div>
          {manualGroups.length > 0 && (
            <div className="border-t border-gray-50 pt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Groupes existants</div>
              {manualGroups.map(g => (
                <div key={g.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    SIMILAR_COLORS[g.color].includes("purple") ? "bg-purple-400" :
                    SIMILAR_COLORS[g.color].includes("blue") ? "bg-blue-400" :
                    SIMILAR_COLORS[g.color].includes("orange") ? "bg-orange-400" :
                    SIMILAR_COLORS[g.color].includes("pink") ? "bg-pink-400" :
                    SIMILAR_COLORS[g.color].includes("teal") ? "bg-teal-400" :
                    SIMILAR_COLORS[g.color].includes("red") ? "bg-red-400" : "bg-yellow-400"
                  }`} />
                  <span className="text-xs text-gray-600 flex-1">{g.skus.join(" · ")}</span>
                  <button onClick={() => removeGroup(g.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <div className="text-xs font-semibold text-gray-500">{sortedProducts.length} produits</div>
            <button onClick={() => setShowGroupPanel(!showGroupPanel)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-all">
              + Grouper
            </button>
            <input type="text" placeholder="Rechercher..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-purple-400 w-48" />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                <Th label="Produit" right={false} />
                <Th label="SKU" right={false} />
                <th className="px-3 py-3 font-medium text-amber-600 text-right whitespace-nowrap bg-amber-50">Prix achat</th>
                <th className="px-3 py-3 font-medium text-amber-600 text-right whitespace-nowrap bg-amber-50">Ads $</th>
                <th className="px-3 py-3 font-medium text-amber-600 text-right whitespace-nowrap bg-amber-50">Bonus</th>
                <Th label="Cmds" sk="totalOrders" />
                <Th label="Annulées" />
                <Th label="Conf." />
                <Th label="Livr." sk="delivered" />
                <Th label="Qté" />
                <Th label="Ventes" sk="sales" />
                <Th label="% Conf" sk="confRate" />
                <Th label="% Liv" sk="livRate" />
                <Th label="Domicile" />
                <Th label="Stop desk" />
                <Th label="Ads DZD" />
                <Th label="Emball." />
                <Th label="Coût prod." />
                <Th label="Confirmation" />
                <Th label="Frais liv." />
                <Th label="TOTAL" />
                <Th label="Profits" sk="profits" />
                <Th label="ROI" sk="roi" />
                <Th label="C/lead$" />
                <Th label="C/livr$" />
                <Th label="Net/pièce" sk="netPiece" />
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((p, i) => {
                const c = calcProduct(p);
                const colorIdx = getSkuColor(p.sku, products);
                const similarClass = colorIdx !== undefined ? SIMILAR_COLORS[colorIdx] : "";
                return (
                  <tr key={i} className={`border-b border-gray-50 hover:brightness-95 transition-all ${similarClass}`}>
                    <td className="px-4 py-2 font-medium text-gray-700 sticky left-0 bg-white max-w-[150px] truncate" dir="rtl">{p.nomProduit}</td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{p.sku}</td>
                    <td className="px-3 py-2 bg-amber-50/60">
                      <input type="number" value={prixAchat[p.sku] || ""}
                        onChange={e => setPrixAchat(prev => ({ ...prev, [p.sku]: Number(e.target.value) || 0 }))}
                        className="w-16 text-right bg-white border border-amber-200 rounded-lg px-1 py-0.5 text-gray-700 focus:outline-none focus:border-amber-400" placeholder="0" />
                    </td>
                    <td className="px-3 py-2 bg-amber-50/60">
                      <input type="number" value={adsDollar[p.sku] || ""}
                        onChange={e => setAdsDollar(prev => ({ ...prev, [p.sku]: Number(e.target.value) || 0 }))}
                        className="w-16 text-right bg-white border border-amber-200 rounded-lg px-1 py-0.5 text-blue-600 font-medium focus:outline-none focus:border-amber-400" placeholder="0" />
                    </td>
                    <td className="px-3 py-2 bg-amber-50/60">
                      <input type="number" value={bonus[p.sku] || ""}
                        onChange={e => setBonus(prev => ({ ...prev, [p.sku]: Number(e.target.value) || 0 }))}
                        className="w-16 text-right bg-white border border-amber-200 rounded-lg px-1 py-0.5 text-gray-600 focus:outline-none focus:border-amber-400" placeholder="0" />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 bg-blue-100/60">{p.totalOrders}</td>
                    <td className="px-3 py-2 text-right text-red-400 font-medium bg-blue-100/60">{p.annulees}</td>
                    <td className="px-3 py-2 text-right text-gray-600 bg-blue-100/60">{c.mouwakkada}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-700 bg-blue-100/60">{p.delivered}</td>
                    <td className="px-3 py-2 text-right text-gray-600 bg-blue-100/60">{p.qte}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700 bg-blue-100/60">{fmt(p.sales)}</td>
                    <td className="px-3 py-2 text-right text-yellow-600 font-medium bg-blue-100/60">{pct(c.confRate)}</td>
                    <td className="px-3 py-2 text-right text-yellow-600 font-medium bg-blue-100/60">{pct(c.livRate)}</td>
                    <td className="px-3 py-2 text-right text-teal-600 bg-blue-100/60">{p.aDomicile} <span className="text-gray-400">({pct(c.domicilePct)})</span></td>
                    <td className="px-3 py-2 text-right text-indigo-600 bg-blue-100/60">{p.stopDesk} <span className="text-gray-400">({pct(c.stopDeskPct)})</span></td>
                    <td className="px-3 py-2 text-right text-blue-500 font-medium bg-blue-100/60">{fmt(c.adsDzd)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 bg-blue-100/60">{fmt(c.packagingTotal)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 bg-blue-100/60">{fmt(c.prixAchatTotal)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 bg-blue-100/60">{fmt(c.mouwakkadaTotal)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 bg-blue-100/60">{fmt(p.totalFrais)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-700 bg-blue-100/60">{fmt(c.total)}</td>
                    <td className={`px-3 py-2 text-right font-bold bg-green-100/60 ${c.profits >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(c.profits)}</td>
                    <td className={`px-3 py-2 text-right font-medium bg-green-100/60 ${c.roi >= 0 ? "text-purple-600" : "text-red-500"}`}>{pct(c.roi)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 bg-green-100/60">${fmt(c.cPerLead, 2)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 bg-green-100/60">${fmt(c.cPerDelivered, 2)}</td>
                    <td className={`px-3 py-2 text-right font-bold bg-green-100/60 ${c.netPiece >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(c.netPiece)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {products.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-300">
          <div className="text-5xl">📊</div>
          <div className="text-sm">Importez un fichier Excel pour commencer</div>
        </div>
      )}
    </div>
  );
}