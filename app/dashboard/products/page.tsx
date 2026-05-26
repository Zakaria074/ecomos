"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { saveSetting, loadSetting } from "@/lib/supabase/settings";

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

interface EcoProduct {
  id: number;
  title: string;
  variants: { sku: string; price: string }[];
  available_stock: number;
}

interface AdAccount {
  id: string;
  name: string;
  spend: number;
  checked: boolean;
}

interface ProductData {
  id: string;
  shop: string;
  title: string;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  rate: number;
  adSpendFb: number;
  adSpendTiktok: number;
  active: boolean;
  addedBy?: string;
  adAccounts?: string[]; // ← حسابات إعلانية مرتبطة بالمنتج
}

function getUserColor(name: string): string {
  const colors = [
    "bg-purple-100 text-purple-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-red-100 text-red-700",
    "bg-yellow-100 text-yellow-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getAccountColor(name: string): string {
  const colors = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Object.values(colors[Math.abs(hash) % colors.length]).join(" ");
}

async function fetchEcoProducts(token: string): Promise<EcoProduct[]> {
  const base = process.env.NEXT_PUBLIC_ECOMANAGER_URL;
  let all: EcoProduct[] = [];
  let url: string | null = `${base}/products?per_page=100`;
  let pages = 0;
  while (url && pages < 20) {
    const res = await fetch(url as string, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const data = await res.json();
    all = [...all, ...(data.data || [])];
    url = data.links?.next || null;
    pages++;
  }
  return all;
}

function calcCostMax(p: ProductData, dollarRate: number): number {
  if (dollarRate <= 0 || p.sellingPrice <= 0) return 0;
  const diff = p.sellingPrice - p.costPrice;
  const r = (p.rate || 0) / 100;
  const maxDZD = diff * r * r;
  return maxDZD / dollarRate;
}

function getAdRisk(adTotal: number, costMax: number): { label: string; color: string; bg: string } {
  if (costMax <= 0) return { label: "—", color: "text-gray-400", bg: "bg-gray-50" };
  if (costMax >= 1.7) return { label: "Mlih", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (costMax >= 1) return { label: "Attention", color: "text-teal-600", bg: "bg-teal-50" };
  return { label: "Moove", color: "text-red-500", bg: "bg-red-50" };
}

function buildPDF(
  title: string, today: string, badge: string,
  cards: any[], tableHead: string, tableRows: string,
  footerCount: number, footerLabel: string
): string {
  const cardsHtml = cards.map(c => `
    <div style="background:${c.bgColor};border:1px solid ${c.borderCard};border-radius:12px;padding:4mm;border-left:4px solid ${c.borderColor}">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${c.subColor};margin-bottom:6px">${c.label}</div>
      <div style="font-size:32px;font-weight:800;color:${c.textColor};line-height:1">${c.value}</div>
      <div style="font-size:10px;color:${c.subColor};margin-top:4px">${c.sub}</div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;background:#fff;color:#111827}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div style="width:210mm;min-height:297mm;padding:14mm 12mm;margin:0 auto">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8mm;padding-bottom:6mm;border-bottom:3px solid #7c3aed">
    <div>
      <div style="font-size:28px;font-weight:800;color:#7c3aed;letter-spacing:-1px">EcomOS</div>
      <div style="font-size:10px;color:#9ca3af;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;margin-top:3px">${title}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${today}</div>
      <div style="background:#f3f0ff;color:#7c3aed;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;border:1px solid #ddd6fe;display:inline-block">${badge}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm">${cardsHtml}</div>
  <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <thead><tr style="background:#7c3aed">${tableHead}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div style="margin-top:8mm;padding-top:5mm;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:10px;color:#9ca3af">Généré par <strong style="color:#7c3aed">EcomOS</strong></div>
    <div style="font-size:10px;color:#9ca3af">${footerCount} produits · ${footerLabel}</div>
  </div>
</div></body></html>`;
}

export default function ProductsAdSpendPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [ecoProductsByShop, setEcoProductsByShop] = useState<Record<string, EcoProduct[]>>({});
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [selectedShopForAdd, setSelectedShopForAdd] = useState("LEKIDI");
  const [dollarRate, setDollarRate] = useState<number>(250);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [pdfStockLoading, setPdfStockLoading] = useState(false);
  const [pdfProfitLoading, setPdfProfitLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState("Admin");
  const [activeAccountFilter, setActiveAccountFilter] = useState<string | null>(null); // ← فلتر الحساب

  const [form, setForm] = useState({
    ecoProductId: "", costPrice: "", sellingPrice: "", rate: "", adSpendFb: "", adSpendTiktok: "",
    adAccounts: [] as string[], // ← حسابات مختارة في النافذة
  });

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Admin";
        setCurrentUser(name);
      }
    });

    const init = async () => {
      const savedProducts = await loadSetting("adspend_products");
      const savedAccounts = await loadSetting("adspend_accounts");
      const savedDollar = await loadSetting("adspend_dollar");
      if (savedProducts) setProducts(savedProducts);
      if (savedAccounts) setAccounts(savedAccounts);
      else setAccounts(["Dino","Echri","SST","Wiaox","108","Choco","Lucky","Tik 1","Tik 2"].map((name, i) => ({
        id: i.toString(), name, spend: 0, checked: false,
      })));
      if (savedDollar) setDollarRate(savedDollar);
      setDataLoaded(true);
    };
    init();

    SHOPS.forEach(s => {
      const token = TOKENS[s.key];
      if (!token) return;
      fetchEcoProducts(token).then(prods => {
        setEcoProductsByShop(prev => ({ ...prev, [s.key]: prods }));
      });
    });
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("adspend_products", products);
  }, [products, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("adspend_accounts", accounts);
  }, [accounts, dataLoaded]);

  const saveDollarRate = (val: string) => {
    const n = Number(val) || 250;
    setDollarRate(n);
    saveSetting("adspend_dollar", n);
  };

  const totalAdSpend = products.filter(p => p.active).reduce((s, p) => s + p.adSpendFb + p.adSpendTiktok, 0);
  const totalAccounts = accounts.filter(a => a.checked).reduce((s, a) => s + (a.spend || 0), 0);
  const activeCount = products.filter(p => p.active).length;
  const stoppedCount = products.filter(p => !p.active).length;

  // ── PDF Stock ──
  const handleGenerateStockPDF = async () => {
    setPdfStockLoading(true);
    try {
      const allProducts: { title: string; sku: string; stock: number }[] = [];
      for (const s of SHOPS) {
        const token = TOKENS[s.key];
        if (!token) continue;
        const prods = await fetchEcoProducts(token);
        prods.forEach(p => allProducts.push({ title: p.title, sku: p.variants?.[0]?.sku || "—", stock: p.available_stock || 0 }));
      }
      allProducts.sort((a, b) => {
        const aH = a.stock > 0 ? 0 : 1; const bH = b.stock > 0 ? 0 : 1;
        if (aH !== bH) return aH - bH;
        return a.sku.localeCompare(b.sku);
      });
      const today = new Date().toLocaleDateString("fr-DZ", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const totalOk = allProducts.filter(p => p.stock > 30).length;
      const totalNormal = allProducts.filter(p => p.stock >= 10 && p.stock <= 30).length;
      const tableHead = `
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:center;width:36px">#</th>
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:left">Produit</th>
        <th style="padding:10px 12px;color:#ddd6fe;font-size:10px;font-weight:700;text-align:left">SKU</th>
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:center">Stock</th>
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:center">Check</th>
      `;
      const tableRows = allProducts.map((p, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">
          <td style="padding:8px 12px;color:#6b7280;font-size:11px;text-align:center;border-bottom:1px solid #f3f4f6">${i + 1}</td>
          <td style="padding:8px 12px;color:#111827;font-size:12px;border-bottom:1px solid #f3f4f6">${p.title}</td>
          <td style="padding:8px 12px;color:#9ca3af;font-size:11px;border-bottom:1px solid #f3f4f6">${p.sku}</td>
          <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6"><span style="font-size:14px;font-weight:700">≈ ${p.stock}</span></td>
          <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6"><div style="width:18px;height:18px;border:2px solid #d1d5db;border-radius:4px;margin:0 auto"></div></td>
        </tr>
      `).join("");
      const html = buildPDF("Rapport de Stock", today, "Stock", [
        { label: "Total produits", value: allProducts.length, sub: "tous les magasins", borderColor: "#7c3aed", bgColor: "#faf5ff", borderCard: "#ddd6fe", textColor: "#7c3aed", subColor: "#a78bfa" },
        { label: "Statut OK", value: totalOk, sub: "plus de 30 unités", borderColor: "#10b981", bgColor: "#f0fdf4", borderCard: "#bbf7d0", textColor: "#10b981", subColor: "#6ee7b7" },
        { label: "Normal", value: totalNormal, sub: "10 à 30 unités", borderColor: "#f59e0b", bgColor: "#fffbeb", borderCard: "#fde68a", textColor: "#f59e0b", subColor: "#fcd34d" },
      ], tableHead, tableRows, allProducts.length, "Stock");
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html); win.document.close();
      setTimeout(() => win.print(), 800);
    } catch (e) { console.error(e); }
    setPdfStockLoading(false);
  };

  // ── PDF Profit ──
  const handleGenerateProfitPDF = async () => {
    setPdfProfitLoading(true);
    try {
      const allProducts: { title: string; sku: string; stock: number }[] = [];
      for (const s of SHOPS) {
        const token = TOKENS[s.key];
        if (!token) continue;
        const prods = await fetchEcoProducts(token);
        prods.forEach(p => allProducts.push({ title: p.title, sku: p.variants?.[0]?.sku || "—", stock: p.available_stock || 0 }));
      }
      allProducts.sort((a, b) => {
        const aH = a.stock > 0 ? 0 : 1; const bH = b.stock > 0 ? 0 : 1;
        if (aH !== bH) return aH - bH;
        return a.sku.localeCompare(b.sku);
      });
      const today = new Date().toLocaleDateString("fr-DZ", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const totalOk = allProducts.filter(p => p.stock > 30).length;
      const totalNormal = allProducts.filter(p => p.stock >= 10 && p.stock <= 30).length;
      const tableHead = `
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:center;width:36px">#</th>
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:left">Produit</th>
        <th style="padding:10px 12px;color:#ddd6fe;font-size:10px;font-weight:700;text-align:left">SKU</th>
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:center">Stock</th>
        <th style="padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-align:center">Profit</th>
      `;
      const tableRows = allProducts.map((p, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">
          <td style="padding:8px 12px;color:#6b7280;font-size:11px;text-align:center;border-bottom:1px solid #f3f4f6">${i + 1}</td>
          <td style="padding:8px 12px;color:#111827;font-size:12px;border-bottom:1px solid #f3f4f6">${p.title}</td>
          <td style="padding:8px 12px;color:#9ca3af;font-size:11px;border-bottom:1px solid #f3f4f6">${p.sku}</td>
          <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6"><span style="font-size:14px;font-weight:700">≈ ${p.stock}</span></td>
          <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6"><div style="width:80%;height:20px;border-bottom:1.5px solid #d1d5db;margin:0 auto"></div></td>
        </tr>
      `).join("");
      const html = buildPDF("Rapport de Profit", today, "Profit", [
        { label: "Total produits", value: allProducts.length, sub: "tous les magasins", borderColor: "#7c3aed", bgColor: "#faf5ff", borderCard: "#ddd6fe", textColor: "#7c3aed", subColor: "#a78bfa" },
        { label: "Statut OK", value: totalOk, sub: "plus de 30 unités", borderColor: "#10b981", bgColor: "#f0fdf4", borderCard: "#bbf7d0", textColor: "#10b981", subColor: "#6ee7b7" },
        { label: "Normal", value: totalNormal, sub: "10 à 30 unités", borderColor: "#f59e0b", bgColor: "#fffbeb", borderCard: "#fde68a", textColor: "#f59e0b", subColor: "#fcd34d" },
      ], tableHead, tableRows, allProducts.length, "Profit");
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(html); win.document.close();
      setTimeout(() => win.print(), 800);
    } catch (e) { console.error(e); }
    setPdfProfitLoading(false);
  };

  // ── حفظ منتج ──
  const saveProduct = () => {
    if (editingId) {
      setProducts(prev => prev.map(p =>
        p.id === editingId ? {
          ...p,
          sellingPrice: Number(form.sellingPrice) || p.sellingPrice,
          costPrice: Number(form.costPrice) || 0,
          rate: Number(form.rate) || 0,
          adSpendFb: Number(form.adSpendFb) || 0,
          adSpendTiktok: Number(form.adSpendTiktok) || 0,
          adAccounts: form.adAccounts,
        } : p
      ));
    } else {
      const ecoList = ecoProductsByShop[selectedShopForAdd] || [];
      const eco = ecoList.find(p => p.id.toString() === form.ecoProductId);
      if (!eco) return;
      const np: ProductData = {
        id: `${selectedShopForAdd}_${eco.id}`,
        shop: selectedShopForAdd,
        title: eco.title,
        sku: eco.variants?.[0]?.sku || "—",
        sellingPrice: Number(form.sellingPrice) || Number(eco.variants?.[0]?.price) || 0,
        costPrice: Number(form.costPrice) || 0,
        rate: Number(form.rate) || 0,
        adSpendFb: Number(form.adSpendFb) || 0,
        adSpendTiktok: Number(form.adSpendTiktok) || 0,
        active: true,
        addedBy: currentUser,
        adAccounts: form.adAccounts,
      };
      setProducts(prev => [...prev, np]);
    }
    setShowAddPanel(false);
    setEditingId(null);
    setProductSearch("");
    setForm({ ecoProductId: "", costPrice: "", sellingPrice: "", rate: "", adSpendFb: "", adSpendTiktok: "", adAccounts: [] });
  };

  const toggleFormAccount = (name: string) => {
    setForm(prev => ({
      ...prev,
      adAccounts: prev.adAccounts.includes(name)
        ? prev.adAccounts.filter(a => a !== name)
        : [...prev.adAccounts, name],
    }));
  };

  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const toggleActive = (id: string) => setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  const updateAccountSpend = (id: string, val: string) => setAccounts(prev => prev.map(a => a.id === id ? { ...a, spend: Number(val) || 0 } : a));
  const toggleAccountCheck = (id: string) => setAccounts(prev => prev.map(a => a.id === id ? { ...a, checked: !a.checked } : a));
  const addAccount = () => {
    if (!newAccountName.trim()) return;
    setAccounts(prev => [...prev, { id: Date.now().toString(), name: newAccountName.trim(), spend: 0, checked: false }]);
    setNewAccountName("");
  };
  const deleteAccount = (id: string) => setAccounts(prev => prev.filter(a => a.id !== id));

  // ── فلتر المنتجات ──
  const filteredProducts = products
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    .filter(p => activeAccountFilter ? p.adAccounts?.includes(activeAccountFilter) : true);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products & Ad Spend</h2>
          <p className="text-sm text-gray-400 mt-0.5">Suivi des dépenses publicitaires — tous les magasins</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGenerateStockPDF} disabled={pdfStockLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-medium hover:border-purple-300 hover:text-purple-600 transition-all shadow-sm disabled:opacity-50">
            {pdfStockLoading ? <><div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />Chargement...</> : <>📦 PDF Stock</>}
          </button>
          <button onClick={handleGenerateProfitPDF} disabled={pdfProfitLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-medium hover:border-purple-300 hover:text-purple-600 transition-all shadow-sm disabled:opacity-50">
            {pdfProfitLoading ? <><div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />Chargement...</> : <>💰 PDF Profit</>}
          </button>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">1$ =</span>
            <input type="number" value={dollarRate} onChange={e => saveDollarRate(e.target.value)}
              className="w-16 text-base font-bold text-purple-600 focus:outline-none bg-transparent text-right" />
            <span className="text-xs text-gray-400 font-medium">DZD</span>
          </div>
        </div>
      </div>

      {/* KPIs + Accounts */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2 grid grid-cols-3 gap-3 items-start">
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-400 rounded-l-2xl"/>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1 pl-2">Total ad spend</div>
            <div className="text-xl font-bold text-purple-600 pl-2">${totalAdSpend.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-400 rounded-l-2xl"/>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1 pl-2">منتج حابس</div>
            <div className="text-xl font-bold text-red-500 pl-2">{stoppedCount}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-400 rounded-l-2xl"/>
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1 pl-2">كم منتج يمشي</div>
            <div className="text-xl font-bold text-green-600 pl-2">{activeCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 pt-3 pb-2 border-b border-gray-50">
            <div className="grid grid-cols-3 w-full text-xs text-gray-400 font-medium">
              <span>ad acc</span>
              <span className="text-right">ad spend $</span>
              <span className="text-center">Check</span>
            </div>
          </div>
          <div className="overflow-y-auto px-4 py-1 space-y-0.5 max-h-64">
            {accounts.map(a => (
              <div key={a.id} className={`grid grid-cols-3 items-center py-1.5 border-b border-gray-50 last:border-0 rounded-lg transition-colors ${a.checked ? "bg-blue-50/60 px-1" : "hover:bg-gray-50"}`}>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-700 font-medium">{a.name}</span>
                  <button onClick={() => deleteAccount(a.id)} className="text-gray-200 hover:text-red-400 text-xs ml-1">✕</button>
                </div>
                <input type="number" value={a.spend || ""} onChange={e => updateAccountSpend(a.id, e.target.value)}
                  className={`text-right bg-transparent text-xs focus:outline-none w-full font-semibold ${a.checked ? "text-blue-600" : "text-gray-500"}`} placeholder="0.00" />
                <div className="flex justify-center">
                  <input type="checkbox" checked={a.checked} onChange={() => toggleAccountCheck(a.id)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-3 pt-2 border-t border-gray-50 space-y-2">
            {accounts.filter(a => a.checked).length > 0 && (
              <div className="flex justify-between items-center text-xs bg-green-50 rounded-xl px-3 py-1.5">
                <span className="text-gray-500 font-medium">Total (cochés)</span>
                <span className="font-bold text-green-600">${totalAccounts.toFixed(2)}</span>
              </div>
            )}
            {showAccountPanel ? (
              <div className="flex gap-2">
                <input type="text" placeholder="Nom..." value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addAccount()}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-purple-400" />
                <button onClick={addAccount} className="px-2 py-1 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700">OK</button>
                <button onClick={() => setShowAccountPanel(false)} className="text-gray-400 text-xs hover:text-gray-600">✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAccountPanel(true)} className="text-xs text-purple-500 hover:text-purple-700 w-full text-left font-medium">
                + Ajouter compte
              </button>
            )}
          </div>
        </div>
      </div>

{/* ── فلتر الحسابات الإعلانية ── */}
<div className="flex items-center gap-2 flex-wrap">
  <button
    onClick={() => setActiveAccountFilter(null)}
    className={`px-4 py-2 rounded-2xl text-sm font-semibold border-2 transition-all ${
      !activeAccountFilter
        ? "bg-purple-600 text-white border-purple-600"
        : "bg-white text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600"
    }`}>
    Tout
  </button>
  {accounts.map(a => (
    <button key={a.id}
      onClick={() => setActiveAccountFilter(activeAccountFilter === a.name ? null : a.name)}
      className={`px-4 py-2 rounded-2xl text-sm font-semibold border-2 transition-all ${
        activeAccountFilter === a.name
          ? "bg-blue-500 text-white border-blue-500"
          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
      }`}>
      {a.name}
      {a.spend > 0 && (
        <span className={`ml-2 font-bold text-xs ${
          activeAccountFilter === a.name ? "text-blue-100" : "text-blue-500"
        }`}>
          ${a.spend.toFixed(2)}
        </span>
      )}
    </button>
  ))}
  {activeAccountFilter && (
    <span className="text-xs text-gray-400 ml-1">
      {filteredProducts.length} منتج
    </span>
  )}
</div>

      {/* ── نافذة الإضافة ── */}
      {showAddPanel && (
        <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">{editingId ? "Modifier le produit" : "Ajouter un produit"}</div>
            <button onClick={() => { setShowAddPanel(false); setProductSearch(""); setForm({ ecoProductId: "", costPrice: "", sellingPrice: "", rate: "", adSpendFb: "", adSpendTiktok: "", adAccounts: [] }); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          {!editingId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Magasin</label>
                <select value={selectedShopForAdd}
                  onChange={e => { setSelectedShopForAdd(e.target.value); setForm(f => ({ ...f, ecoProductId: "", sellingPrice: "" })); setProductSearch(""); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-400">
                  {SHOPS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Produit</label>
                <div className="relative">
                  <input type="text" placeholder="Rechercher produit..." value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setForm(f => ({ ...f, ecoProductId: "", sellingPrice: "" })); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-400" />
                  {form.ecoProductId && (
                    <div className="mt-1 text-xs text-purple-600 font-medium px-1">
                      ✓ {(ecoProductsByShop[selectedShopForAdd] || []).find(p => p.id.toString() === form.ecoProductId)?.title}
                    </div>
                  )}
                  {!form.ecoProductId && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                      {(ecoProductsByShop[selectedShopForAdd] || [])
                        .filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()))
                        .slice(0, 200)
                        .map(p => (
                          <div key={p.id}
                            onClick={() => { setForm(f => ({ ...f, ecoProductId: p.id.toString(), sellingPrice: p.variants?.[0]?.price || "" })); setProductSearch(p.title); }}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-gray-50 last:border-0">
                            {p.title} <span className="text-gray-400 text-xs">— {p.variants?.[0]?.sku || "—"}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Prix vente (DZD)", key: "sellingPrice" },
              { label: "Prix achat (DZD)", key: "costPrice" },
              { label: "Taux % (conf+livr)", key: "rate" },
              { label: "Ad Spend FB ($)", key: "adSpendFb" },
              { label: "Ad Spend TikTok ($)", key: "adSpendTiktok" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input type="number" placeholder="0" value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-400" />
              </div>
            ))}
          </div>

          {/* ── اختيار الحسابات الإعلانية ── */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Comptes publicitaires</label>
            <div className="flex flex-wrap gap-2">
              {accounts.map(a => (
                <button key={a.id} type="button"
                  onClick={() => toggleFormAccount(a.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    form.adAccounts.includes(a.name)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}>
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          {form.sellingPrice && form.costPrice && form.rate && (
            <div className="bg-orange-50 rounded-xl px-4 py-2.5 flex items-center gap-4 text-sm">
              <span className="text-gray-500">فارق:</span>
              <span className="font-semibold text-gray-700">{(Number(form.sellingPrice) - Number(form.costPrice)).toLocaleString()} DZD</span>
              <span className="text-gray-300">→</span>
              <span className="text-gray-500">Cost Max:</span>
              <span className="font-bold text-orange-500">
                ${((Number(form.sellingPrice) - Number(form.costPrice)) * Math.pow(Number(form.rate) / 100, 2) / dollarRate).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={saveProduct} disabled={!editingId && !form.ecoProductId}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-700 transition-all">
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {/* ── جدول المنتجات ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-900">
            Produits — tous les magasins
            {activeAccountFilter && (
              <span className="ml-2 text-xs text-blue-500 font-normal">· {activeAccountFilter}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 w-56" />
            <button onClick={() => { setShowAddPanel(true); setEditingId(null); setForm({ ecoProductId: "", costPrice: "", sellingPrice: "", rate: "", adSpendFb: "", adSpendTiktok: "", adAccounts: [] }); }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm shadow-purple-200">
              + Ajouter
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-3 font-medium w-8"></th>
              <th className="text-left pb-3 font-medium">منتج</th>
              <th className="text-left pb-3 font-medium">متجر</th>
              <th className="text-left pb-3 font-medium">حسابات</th>
              <th className="text-right pb-3 font-medium">سعر البيع</th>
              <th className="text-right pb-3 font-medium">سعر الشراء</th>
              <th className="text-right pb-3 font-medium">%</th>
              <th className="text-right pb-3 font-medium">ad spend fb</th>
              <th className="text-right pb-3 font-medium">ad spend tiktok</th>
              <th className="text-right pb-3 font-medium">Total</th>
              <th className="text-right pb-3 font-medium text-orange-500">Cost Max</th>
              <th className="text-right pb-3 font-medium">Ads risk</th>
              <th className="text-center pb-3 font-medium">راه حابس</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-12 text-gray-300">
                  <div className="text-3xl mb-2">📦</div>
                  <div className="text-xs">Aucun produit</div>
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => {
                const total = p.adSpendFb + p.adSpendTiktok;
                const costMax = calcCostMax(p, dollarRate);
                const risk = getAdRisk(total, costMax);
                const shopName = SHOPS.find(s => s.key === p.shop)?.name || p.shop;
                return (
                  <tr key={p.id} className={`border-b border-gray-50 last:border-0 transition-colors ${!p.active ? "opacity-40" : "hover:bg-gray-50/70"}`}>
                    <td className="py-2.5 pr-1">
                      {p.addedBy && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${getUserColor(p.addedBy)}`}>
                          {p.addedBy.slice(0, 4)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-700 font-medium max-w-[180px] truncate">{p.title}</td>
                    <td className="py-2.5">
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg font-medium">{shopName}</span>
                    </td>
                    {/* ── عمود الحسابات ── */}
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(p.adAccounts || []).map(acc => (
                          <span key={acc}
                            onClick={() => setActiveAccountFilter(activeAccountFilter === acc ? null : acc)}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors">
                            {acc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-gray-700 font-medium">{p.sellingPrice.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-500 font-medium">{p.costPrice.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-400 text-xs">{p.rate || 0}%</td>
                    <td className="py-2.5 text-right"><span className="text-blue-500 font-medium">{p.adSpendFb.toFixed(2)}</span></td>
                    <td className="py-2.5 text-right"><span className="text-pink-500 font-medium">{p.adSpendTiktok.toFixed(2)}</span></td>
                    <td className="py-2.5 text-right font-semibold text-gray-700">{total.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold text-orange-500">${costMax.toFixed(2)}</td>
                    <td className="py-2.5 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${risk.bg} ${risk.color}`}>{risk.label}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      <button onClick={() => toggleActive(p.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${p.active ? "bg-purple-500 shadow-sm shadow-purple-200" : "bg-gray-200"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all duration-300 ${p.active ? "translate-x-6" : "translate-x-1"}`}/>
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => {
                          setEditingId(p.id);
                          setForm({
                            ecoProductId: p.id,
                            sellingPrice: p.sellingPrice.toString(),
                            costPrice: p.costPrice.toString(),
                            rate: p.rate?.toString() || "",
                            adSpendFb: p.adSpendFb.toString(),
                            adSpendTiktok: p.adSpendTiktok.toString(),
                            adAccounts: p.adAccounts || [],
                          });
                          setShowAddPanel(true);
                        }} className="text-gray-300 hover:text-purple-500 transition-colors text-xs">✏️</button>
                        <button onClick={() => deleteProduct(p.id)} className="text-gray-300 hover:text-red-500 transition-colors text-xs">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}