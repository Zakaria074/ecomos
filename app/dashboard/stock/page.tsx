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

interface Product {
  id: number;
  title: string;
  variants: { sku: string }[];
  available_stock: number;
  open_stock: number;
}

interface ProductGroup {
  id: string;
  name: string;
  productTitles: string[];
}

async function fetchProducts(token: string): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_ECOMANAGER_URL;
  let all: Product[] = [];
  let url: string | null = `${base}/products?per_page=100`;
  let pages = 0;
  while (url && pages < 20) {
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

const GROUPS_KEY = "ecomos_product_groups";

function loadGroups(): ProductGroup[] {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]"); } catch { return []; }
}
function saveGroups(groups: ProductGroup[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export default function StockPage() {
  const [shop, setShop] = useState("GYMFORCE");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  useEffect(() => { setGroups(loadGroups()); }, []);

  useEffect(() => {
    const token = TOKENS[shop];
    if (!token) return;
    setLoading(true);
    fetchProducts(token).then(prods => {
      setProducts(prods);
      setLoading(false);
    });
  }, [shop]);

  const saveGroup = () => {
    if (!groupName.trim() || selectedTitles.length < 2) return;
    let updated: ProductGroup[];
    if (editingGroup) {
      updated = groups.map(g => g.id === editingGroup ? { ...g, name: groupName, productTitles: selectedTitles } : g);
    } else {
      updated = [...groups, { id: Date.now().toString(), name: groupName, productTitles: selectedTitles }];
    }
    saveGroups(updated);
    setGroups(updated);
    setShowGroupPanel(false);
    setGroupName("");
    setSelectedTitles([]);
    setEditingGroup(null);
  };

  const deleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    saveGroups(updated);
    setGroups(updated);
  };

  const openEdit = (g: ProductGroup) => {
    setEditingGroup(g.id);
    setGroupName(g.name);
    setSelectedTitles(g.productTitles);
    setShowGroupPanel(true);
  };

  const groupedTitles = new Set(groups.flatMap(g => g.productTitles));

  const filtered = products.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.variants?.[0]?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  type Row =
    | { type: "group"; group: ProductGroup; qty: number }
    | { type: "product"; product: Product; qty: number };

  const rows: Row[] = [];

  groups.forEach(g => {
    const matchedProducts = products.filter(p => g.productTitles.includes(p.title));
    const qty = matchedProducts.reduce((s, p) => s + (p.available_stock || 0), 0);
    rows.push({ type: "group", group: g, qty });
  });

  filtered
    .filter(p => !groupedTitles.has(p.title))
    .sort((a, b) => sortAsc
      ? (a.available_stock || 0) - (b.available_stock || 0)
      : (b.available_stock || 0) - (a.available_stock || 0)
    )
    .forEach(p => {
      rows.push({ type: "product", product: p, qty: p.available_stock || 0 });
    });

  const getStatus = (qty: number) => {
    if (qty >= 5 && qty < 10) return { label: "Risque", color: "text-red-600 bg-red-50" };
    if (qty >= 10 && qty <= 30) return { label: "Normal", color: "text-yellow-600 bg-yellow-50" };
    if (qty > 30) return { label: "OK", color: "text-green-600 bg-green-50" };
    return { label: "Vide", color: "text-gray-400 bg-gray-50" };
  };

  // Stats avec nouvelle définition Risque = 5 à 10
  const risque = filtered.filter(p => (p.available_stock || 0) >= 5 && (p.available_stock || 0) < 10);
  const normal = filtered.filter(p => (p.available_stock || 0) >= 10 && (p.available_stock || 0) <= 30).length;
  const ok = filtered.filter(p => (p.available_stock || 0) > 30).length;

  // Top 5 risque produits
  const top5Risque = risque
    .sort((a, b) => (a.available_stock || 0) - (b.available_stock || 0))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Stock</h2>
          <p className="text-sm text-gray-400 mt-0.5">Suivi du stock en temps réel</p>
        </div>
        <div className="flex gap-2">
          {SHOPS.map(s => (
            <button key={s.key} onClick={() => setShop(s.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                shop === s.key ? "bg-purple-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600"
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {showGroupPanel && (
        <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              {editingGroup ? "Modifier le groupe" : "Nouveau groupe"}
            </div>
            <button onClick={() => { setShowGroupPanel(false); setEditingGroup(null); }}
              className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <input type="text" placeholder="Nom du groupe..." value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-400" />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {products.map(p => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedTitles.includes(p.title)}
                  onChange={e => {
                    if (e.target.checked) setSelectedTitles(prev => [...prev, p.title]);
                    else setSelectedTitles(prev => prev.filter(t => t !== p.title));
                  }}
                  className="accent-purple-600" />
                <span className="text-sm text-gray-700">{p.title}</span>
                <span className="text-xs text-gray-400 ml-auto">{p.variants?.[0]?.sku || "—"}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <span className="text-xs text-gray-400 self-center">{selectedTitles.length} produit(s) sélectionné(s)</span>
            <button onClick={saveGroup} disabled={!groupName.trim() || selectedTitles.length < 2}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-700 transition-all">
              {editingGroup ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      )}

      {groups.length > 0 && !showGroupPanel && (
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-1.5">
              <span className="text-xs font-medium text-purple-700">{g.name}</span>
              <span className="text-xs text-purple-400">{g.productTitles.length} produits</span>
              <button onClick={() => openEdit(g)} className="text-purple-400 hover:text-purple-600 text-xs">✏️</button>
              <button onClick={() => deleteGroup(g.id)} className="text-purple-400 hover:text-red-500 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-400 text-sm">Chargement...</div>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">

            {/* Risque card مع Top 5 */}
            <div className="bg-white rounded-2xl border-l-4 border-l-red-400 border border-gray-100 p-4 shadow-sm">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Risque (5 à 10)</div>
              <div className="text-2xl font-bold text-red-600 mb-3">{risque.length}</div>
              {top5Risque.length > 0 && (
                <div className="space-y-1.5 border-t border-red-50 pt-2">
                  {top5Risque.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-600 truncate flex-1">{p.title}</span>
                      <span className="text-xs font-bold text-red-500 flex-shrink-0">{p.available_stock}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border-l-4 border-l-yellow-400 border border-gray-100 p-4 shadow-sm">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Normal (10 à 30)</div>
              <div className="text-2xl font-bold text-yellow-600">{normal}</div>
            </div>

            <div className="bg-white rounded-2xl border-l-4 border-l-green-400 border border-gray-100 p-4 shadow-sm">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">OK (plus de 30)</div>
              <div className="text-2xl font-bold text-green-600">{ok}</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-900">Tous les produits</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowGroupPanel(true); setEditingGroup(null); setGroupName(""); setSelectedTitles([]); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-all">
                  + Grouper
                </button>
                <input type="text" placeholder="Rechercher..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 w-64" />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-3 font-medium">Produit</th>
                  <th className="text-left pb-3 font-medium">SKU</th>
                  <th className="text-right pb-3 font-medium cursor-pointer select-none hover:text-purple-600"
                    onClick={() => setSortAsc(!sortAsc)}>
                    Qté physique {sortAsc ? "↑" : "↓"}
                  </th>
                  <th className="text-right pb-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">Aucun produit</td></tr>
                ) : (
                  rows.map(row => {
                    if (row.type === "group") {
                      const status = getStatus(row.qty);
                      return (
                        <tr key={row.group.id} className="border-b border-purple-50 bg-purple-50/40 hover:bg-purple-50">
                          <td className="py-2.5 font-semibold text-purple-700">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-lg">Groupe</span>
                              {row.group.name}
                            </div>
                          </td>
                          <td className="py-2.5 text-gray-400 text-xs">{row.group.productTitles.length} produits</td>
                          <td className="py-2.5 text-right font-bold text-gray-700">{row.qty}</td>
                          <td className="py-2.5 text-right">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    const status = getStatus(row.qty);
                    return (
                      <tr key={row.product.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-2.5 text-gray-700 font-medium truncate max-w-[200px]">{row.product.title}</td>
                        <td className="py-2.5 text-gray-400 text-xs">{row.product.variants?.[0]?.sku || "—"}</td>
                        <td className="py-2.5 text-right font-bold text-gray-700">{row.qty}</td>
                        <td className="py-2.5 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}