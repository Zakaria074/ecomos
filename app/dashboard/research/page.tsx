"use client";

import { useState } from "react";

const PRESET_PAGES = [
  "Shein Algeria",
  "Jumia Algeria",
  "Ouedkniss",
  "DZ Shop",
  "Algeria Store",
];

type Stage = "prospecting" | "research" | "testing" | "winner" | "loser";

interface Product {
  id: string;
  name: string;
  image?: string;
  price?: string;
  stage: Stage;
  daysAgo?: number;
  adsCount?: number;
  description?: string;
}

const STAGES: { key: Stage; label: string; icon: string; color: string; bg: string; border: string }[] = [
  { key: "prospecting", label: "PROSPECTING", icon: "🔍", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  { key: "research",    label: "RESEARCH",    icon: "📊", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "testing",     label: "TESTING",     icon: "🧪", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { key: "winner",      label: "WINNER",      icon: "🏆", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  { key: "loser",       label: "LOSER",       icon: "❌", color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
];

export default function ProductResearchPage() {
  const [pages, setPages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", image: "", price: "", stage: "prospecting" as Stage });

  const addPage = () => {
    const val = input.trim();
    if (!val || pages.includes(val)) return;
    setPages(prev => [...prev, val]);
    setInput("");
  };

  const removePage = (p: string) => setPages(prev => prev.filter(x => x !== p));
  const addPreset = (p: string) => { if (!pages.includes(p)) setPages(prev => [...prev, p]); };

  const handleStart = async () => {
    if (pages.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });
      const data = await res.json();
      if (data.products) {
        const newProducts: Product[] = data.products.map((p: any) => ({
          id: Date.now().toString() + Math.random(),
          name: p.name,
          image: p.image,
          price: p.price,
          description: p.description,
          stage: "prospecting",
          daysAgo: 0,
          adsCount: 0,
        }));
        setProducts(prev => [...prev, ...newProducts]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stage: Stage) => {
    if (!dragId) return;
    setProducts(prev => prev.map(p => p.id === dragId ? { ...p, stage } : p));
    setDragId(null);
  };

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;
    setProducts(prev => [...prev, {
      id: Date.now().toString(),
      name: newProduct.name,
      image: newProduct.image,
      price: newProduct.price,
      stage: newProduct.stage,
      daysAgo: 0,
      adsCount: 0,
    }]);
    setNewProduct({ name: "", image: "", price: "", stage: "prospecting" });
    setShowAddModal(false);
  };

  const removeProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const totalByStage = (stage: Stage) => products.filter(p => p.stage === stage).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">🔍 Product Research</h2>
          <p className="text-sm text-gray-400 mt-0.5">Découvrez, analysez et scalez vos produits gagnants</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-2xl text-sm font-medium hover:bg-purple-700 transition-all shadow-sm shadow-purple-200">
          + Ajouter un produit
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3">
        {[
          { label: "Total", value: products.length, bg: "bg-gray-100", color: "text-gray-700", icon: "⊞" },
          { label: "Prospecting", value: totalByStage("prospecting"), bg: "bg-gray-50", color: "text-gray-600", icon: "🔍" },
          { label: "Research", value: totalByStage("research"), bg: "bg-blue-50", color: "text-blue-600", icon: "📊" },
          { label: "Winners", value: totalByStage("winner"), bg: "bg-yellow-50", color: "text-yellow-600", icon: "🏆" },
          { label: "Losers", value: totalByStage("loser"), bg: "bg-red-50", color: "text-red-500", icon: "❌" },
          { label: "Testing", value: totalByStage("testing"), bg: "bg-green-50", color: "text-green-600", icon: "🧪" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${s.bg} border border-gray-100`}>
            <span className="text-sm">{s.icon}</span>
            <div>
              <div className={`text-lg font-bold ${s.color} leading-none`}>{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recherche par Claude AI</p>
        <div className="flex gap-2">
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPage()}
            placeholder="Nom de la page Facebook..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-400" />
          <button onClick={addPage}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all">
            +
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_PAGES.map(p => (
            <button key={p} onClick={() => addPreset(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                pages.includes(p)
                  ? "bg-purple-50 border-purple-200 text-purple-600"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-500"
              }`}>
              {p}
            </button>
          ))}
        </div>

        {pages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pages.map((p, i) => (
              <div key={p} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5">
                <span className="text-xs font-semibold text-purple-400">{i + 1}</span>
                <span className="text-xs text-purple-700">{p}</span>
                <button onClick={() => removePage(p)} className="text-purple-300 hover:text-red-400 text-sm leading-none ml-1">×</button>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleStart} disabled={pages.length === 0 || loading}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Claude analyse...
            </>
          ) : (
            <>🔍 Start — Analyser avec Claude</>
          )}
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => (
          <div key={stage.key} onDragOver={handleDragOver} onDrop={() => handleDrop(stage.key)}
            className="flex-shrink-0 w-56 flex flex-col gap-2">
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${stage.bg} border ${stage.border}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{stage.icon}</span>
                <span className={`text-xs font-bold ${stage.color} tracking-wide`}>{stage.label}</span>
              </div>
              <span className={`text-xs font-bold ${stage.color} bg-white rounded-lg px-2 py-0.5 border ${stage.border}`}>
                {totalByStage(stage.key)}
              </span>
            </div>

            <div className="flex flex-col gap-2 min-h-[200px]">
              {products.filter(p => p.stage === stage.key).map(product => (
                <div key={product.id} draggable onDragStart={() => handleDragStart(product.id)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative">
                  <div className="relative w-full h-36 bg-gray-100">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🖼</div>
                    )}
                    <button onClick={() => removeProduct(product.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-white rounded-full shadow text-gray-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      ×
                    </button>
                    {product.adsCount !== undefined && product.adsCount > 0 && (
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-lg">
                        📋 {product.adsCount}
                      </div>
                    )}
                    {product.daysAgo !== undefined && product.daysAgo > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-lg">
                        🕐 {product.daysAgo}j
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-800 truncate">{product.name}</p>
                    {product.price && <p className="text-xs text-gray-400 mt-0.5">{product.price}</p>}
                    {product.description && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{product.description}</p>}
                  </div>
                </div>
              ))}

              {products.filter(p => p.stage === stage.key).length === 0 && (
                <div className={`border-2 border-dashed ${stage.border} rounded-2xl h-24 flex items-center justify-center`}>
                  <p className="text-xs text-gray-300">Drop here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add product modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-96 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Ajouter un produit</p>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nom du produit</label>
                <input type="text" value={newProduct.name}
                  onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Image URL</label>
                <input type="text" value={newProduct.image}
                  onChange={e => setNewProduct(p => ({ ...p, image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Prix</label>
                <input type="text" value={newProduct.price}
                  onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                  placeholder="$0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Stage</label>
                <select value={newProduct.stage}
                  onChange={e => setNewProduct(p => ({ ...p, stage: e.target.value as Stage }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400">
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAddProduct}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all">
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}