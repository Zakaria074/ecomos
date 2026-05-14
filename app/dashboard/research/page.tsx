"use client";

import { useState, useRef, useEffect } from "react";

type Stage = "prospecting" | "research" | "testing" | "winner" | "loser";

interface PageEntry { id: string; label: string; url: string; }
interface Product   { id: string; name: string; image: string; price: string; stage: Stage; note: string; }

const PRESETS: PageEntry[] = [
  { id: "pre1", label: "Meta Ad Library – DZ",    url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=DZ" },
  { id: "pre2", label: "TikTok Creative Center",   url: "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en" },
  { id: "pre3", label: "AliExpress Trending",      url: "https://www.aliexpress.com/category/trending" },
  { id: "pre4", label: "Jumia Algeria",             url: "https://www.jumia.com.dz" },
  { id: "pre5", label: "Ouedkniss",                 url: "https://www.ouedkniss.com" },
  { id: "pre6", label: "Shein Algeria",             url: "https://www.shein.com/ar/algeria" },
  { id: "pre7", label: "Facebook – DZ Shop",       url: "https://www.facebook.com/search/top?q=dz+shop+algeria" },
  { id: "pre8", label: "Minea",                     url: "https://minea.com" },
];

const STAGES: { key: Stage; label: string; emoji: string; accent: string; soft: string; dot: string }[] = [
  { key: "prospecting", label: "Prospecting", emoji: "🔍", accent: "text-slate-600",  soft: "bg-slate-50 border-slate-200",    dot: "bg-slate-400"  },
  { key: "research",    label: "Research",    emoji: "📊", accent: "text-blue-600",   soft: "bg-blue-50 border-blue-200",      dot: "bg-blue-500"   },
  { key: "testing",     label: "Testing",     emoji: "🧪", accent: "text-violet-600", soft: "bg-violet-50 border-violet-200",  dot: "bg-violet-500" },
  { key: "winner",      label: "Winner",      emoji: "🏆", accent: "text-amber-600",  soft: "bg-amber-50 border-amber-200",    dot: "bg-amber-400"  },
  { key: "loser",       label: "Loser",       emoji: "✕",  accent: "text-red-500",    soft: "bg-red-50 border-red-200",        dot: "bg-red-400"    },
];

function normalizeUrl(raw: string) {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.includes(".")) return `https://${s}`;
  return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=DZ&q=${encodeURIComponent(s)}`;
}

export default function ProductResearchPage() {
  const [pages, setPages]       = useState<PageEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("pr_pages") || "[]"); } catch { return []; }
  });
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("pr_products") || "[]"); } catch { return []; }
  });
  const [labelIn, setLabel]     = useState("");
  const [urlIn, setUrl]         = useState("");
  const [openMsg, setOpenMsg]   = useState("");
  const [dragId, setDragId]     = useState<string | null>(null);
  const [modal, setModal]       = useState(false);
  const [newP, setNewP]         = useState<Omit<Product,"id">>({ name:"", image:"", price:"", stage:"prospecting", note:"" });
  const labelRef                = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem("pr_pages",    JSON.stringify(pages));    }, [pages]);
  useEffect(() => { localStorage.setItem("pr_products", JSON.stringify(products)); }, [products]);

  function addPage() {
    const url   = normalizeUrl(urlIn || labelIn);
    const label = labelIn.trim() || urlIn.trim();
    if (!label || !url || pages.find(p => p.url === url)) return;
    setPages(prev => [...prev, { id: Date.now().toString(), label, url }]);
    setLabel(""); setUrl(""); labelRef.current?.focus();
  }
  function togglePreset(pr: PageEntry) {
    setPages(prev => prev.find(p => p.id === pr.id) ? prev.filter(p => p.id !== pr.id) : [...prev, pr]);
  }
  function openAll() {
    if (!pages.length) return;
    pages.forEach(p => window.open(p.url, "_blank", "noopener,noreferrer"));
    setOpenMsg(`✓ ${pages.length} onglet${pages.length > 1 ? "s" : ""} ouvert${pages.length > 1 ? "s" : ""}`);
    setTimeout(() => setOpenMsg(""), 3000);
  }
  function addProduct() {
    if (!newP.name.trim()) return;
    setProducts(prev => [...prev, { ...newP, id: Date.now().toString() }]);
    setNewP({ name:"", image:"", price:"", stage:"prospecting", note:"" });
    setModal(false);
  }
  function onDrop(stage: Stage) {
    if (!dragId) return;
    setProducts(prev => prev.map(p => p.id === dragId ? { ...p, stage } : p));
    setDragId(null);
  }
  const byStage = (s: Stage) => products.filter(p => p.stage === s);

  return (
    <div className="min-h-screen bg-white">

      {/* HEADER */}
      <div className="px-6 pt-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">🔍 Product Research</h1>
            <p className="text-sm text-gray-400 mt-0.5">Ouvrez vos sources en un clic · analysez · classez</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
            + Ajouter un produit
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-sm font-semibold text-gray-800">{products.length}</span>
          </div>
          {STAGES.map(s => (
            <div key={s.key} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${s.soft}`}>
              <span className="text-xs">{s.emoji}</span>
              <span className={`text-xs ${s.accent}`}>{s.label}</span>
              <span className={`text-sm font-semibold ${s.accent}`}>{byStage(s.key).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SOURCES PANEL */}
      <div className="mx-6 mb-6 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm">🌐</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Sources</span>
            {pages.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-600 font-semibold px-2 py-0.5 rounded-full">{pages.length}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {openMsg && <span className="text-xs text-green-600 font-medium">{openMsg}</span>}
            <button onClick={openAll} disabled={!pages.length}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Ouvrir tout ({pages.length})
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input ref={labelRef} value={labelIn} onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPage()}
              placeholder="Nom de page / URL..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 placeholder-gray-300"/>
            <input value={urlIn} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPage()}
              placeholder="URL (optionnel)"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 placeholder-gray-300"/>
            <button onClick={addPage}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition-colors">
              + Ajouter
            </button>
          </div>

          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2 font-medium">Raccourcis rapides</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(pr => {
                const active = !!pages.find(p => p.id === pr.id);
                return (
                  <button key={pr.id} onClick={() => togglePreset(pr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      active ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600"
                    }`}>
                    {pr.label}
                  </button>
                );
              })}
            </div>
          </div>

          {pages.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Sélectionnés</p>
              {pages.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 group">
                  <span className="text-[11px] font-bold text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{p.label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{p.url}</p>
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-600 transition-all shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                  <button onClick={() => setPages(prev => prev.filter(x => x.id !== p.id))}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-lg leading-none transition-all shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KANBAN */}
      <div className="px-6 pb-8">
        <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-3">Pipeline produits</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map(stage => (
            <div key={stage.key} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(stage.key)}
              className="flex-shrink-0 w-52 flex flex-col gap-2">
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${stage.soft}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{stage.emoji}</span>
                  <span className={`text-[11px] font-bold tracking-wider uppercase ${stage.accent}`}>{stage.label}</span>
                </div>
                <span className={`text-xs font-bold ${stage.accent} bg-white rounded-lg px-2 py-0.5 border ${stage.soft.split(" ")[1]}`}>
                  {byStage(stage.key).length}
                </span>
              </div>
              <div className="flex flex-col gap-2 min-h-[160px]">
                {byStage(stage.key).map(product => (
                  <div key={product.id} draggable onDragStart={() => setDragId(product.id)}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-grab active:cursor-grabbing hover:border-purple-200 hover:shadow-md transition-all group">
                    <div className="relative h-32 bg-gray-50">
                      {product.image
                        ? <img src={product.image} alt={product.name} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">🖼</div>
                      }
                      <button onClick={() => setProducts(prev => prev.filter(p => p.id !== product.id))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-white rounded-full border border-gray-200 text-gray-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm">
                        ×
                      </button>
                      <div className={`absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full ${stage.dot}`}/>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-gray-800 truncate">{product.name}</p>
                      {product.price && <p className="text-xs text-purple-600 font-medium mt-0.5">{product.price}</p>}
                      {product.note  && <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{product.note}</p>}
                    </div>
                  </div>
                ))}
                {byStage(stage.key).length === 0 && (
                  <div className={`border-2 border-dashed ${stage.soft.split(" ")[1]} rounded-2xl h-20 flex items-center justify-center`}>
                    <p className="text-[11px] text-gray-300">Glisser ici</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.25)"}}
          onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-96 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Nouveau produit</p>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              {([
                { label:"Nom du produit *", key:"name",  ph:"Ex: Ceinture sport femme" },
                { label:"Image URL",        key:"image", ph:"https://..." },
                { label:"Prix",             key:"price", ph:"2 500 DA" },
                { label:"Note",             key:"note",  ph:"Observation rapide..." },
              ] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input value={(newP as any)[f.key]}
                    onChange={e => setNewP(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400"/>
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Stage</label>
                <select value={newP.stage} onChange={e => setNewP(p => ({ ...p, stage: e.target.value as Stage }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400">
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                </select>
              </div>
              <button onClick={addProduct}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors">
                Ajouter au kanban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}