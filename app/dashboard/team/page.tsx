"use client";

import { useState, useRef, useCallback } from "react";

interface SuiviResult {
  fileName: string;
  totalOrders: number;
  suivi1: number;
  suivi2: number;
  suivi3: number;
  suivi4: number;
  withAnySuivi: number;
  withoutSuivi: number;
  valid: boolean;
}

interface AggregatedResult {
  totalOrders: number;
  suivi1: number;
  suivi2: number;
  suivi3: number;
  suivi4: number;
  withAnySuivi: number;
  withoutSuivi: number;
}

const SUIVI_LABELS = ["Suivi 1", "Suivi 2", "Suivi 3", "Suivi 4"] as const;

function analyzeHTML(html: string, targetDate: string): Omit<SuiviResult, "fileName"> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const allOrderEls = doc.querySelectorAll<HTMLElement>('div.maj[data-id]');

  // Step 1: unique order IDs
  const allOrderIds = new Set<string>();
  allOrderEls.forEach(el => {
    const id = el.getAttribute("data-id");
    if (id) allOrderIds.add(id);
  });

  // Step 2: global sets
  const globalSuivi1 = new Set<string>();
  const globalSuivi2 = new Set<string>();
  const globalSuivi3 = new Set<string>();
  const globalSuivi4 = new Set<string>();

  // Process each unique order (use first occurrence)
  const processedIds = new Set<string>();

  allOrderEls.forEach(el => {
    const orderId = el.getAttribute("data-id");
    if (!orderId || processedIds.has(orderId)) return;
    processedIds.add(orderId);

    const orderSuivis = new Set<string>();
    const smalls = el.querySelectorAll("small");

    smalls.forEach(small => {
      const text = small.textContent || "";

      // Extract date: "Le :YYYY-MM-DD HH:MM:SS"
      const dateMatch = text.match(/Le\s*:\s*(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return;
      if (dateMatch[1] !== targetDate) return;

      // Exact match for Suivi 1..4 (word boundary to avoid Suivi 10, Suivi 20 etc)
      for (const label of SUIVI_LABELS) {
        const regex = new RegExp(`\\b${label}\\b`);
        if (regex.test(text)) {
          orderSuivis.add(label);
        }
      }
    });

    // Update global sets
    if (orderSuivis.has("Suivi 1")) globalSuivi1.add(orderId);
    if (orderSuivis.has("Suivi 2")) globalSuivi2.add(orderId);
    if (orderSuivis.has("Suivi 3")) globalSuivi3.add(orderId);
    if (orderSuivis.has("Suivi 4")) globalSuivi4.add(orderId);
  });

  // Step 3: union
  const ordersWithAnySuivi = new Set([
    ...globalSuivi1,
    ...globalSuivi2,
    ...globalSuivi3,
    ...globalSuivi4,
  ]);

  const ordersWithoutSuivi = new Set(
    [...allOrderIds].filter(id => !ordersWithAnySuivi.has(id))
  );

  const total = allOrderIds.size;
  const withAny = ordersWithAnySuivi.size;
  const withoutAny = ordersWithoutSuivi.size;
  const valid = withAny + withoutAny === total;

  return {
    totalOrders: total,
    suivi1: globalSuivi1.size,
    suivi2: globalSuivi2.size,
    suivi3: globalSuivi3.size,
    suivi4: globalSuivi4.size,
    withAnySuivi: withAny,
    withoutSuivi: withoutAny,
    valid,
  };
}

function aggregate(results: SuiviResult[]): AggregatedResult {
  return results.reduce(
    (acc, r) => ({
      totalOrders: acc.totalOrders + r.totalOrders,
      suivi1: acc.suivi1 + r.suivi1,
      suivi2: acc.suivi2 + r.suivi2,
      suivi3: acc.suivi3 + r.suivi3,
      suivi4: acc.suivi4 + r.suivi4,
      withAnySuivi: acc.withAnySuivi + r.withAnySuivi,
      withoutSuivi: acc.withoutSuivi + r.withoutSuivi,
    }),
    { totalOrders: 0, suivi1: 0, suivi2: 0, suivi3: 0, suivi4: 0, withAnySuivi: 0, withoutSuivi: 0 }
  );
}

export default function TeamVerificationPage() {
  const [targetDate, setTargetDate] = useState("2026-05-13");
  const [results, setResults] = useState<SuiviResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true);
    const arr = Array.from(files).filter(f => f.name.endsWith(".html") || f.name.endsWith(".htm"));
    const newResults: SuiviResult[] = [];

    for (const file of arr) {
      const html = await file.text();
      const analysis = analyzeHTML(html, targetDate);
      newResults.push({ fileName: file.name, ...analysis });
    }

    setResults(prev => [...prev, ...newResults]);
    setLoading(false);
  }, [targetDate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const agg = aggregate(results);
  const aggValid = agg.withAnySuivi + agg.withoutSuivi === agg.totalOrders;

  const suiviColors = [
    { bg: "bg-purple-50", text: "text-purple-700", num: "text-purple-800", border: "border-purple-100" },
    { bg: "bg-teal-50",   text: "text-teal-700",   num: "text-teal-800",   border: "border-teal-100"   },
    { bg: "bg-amber-50",  text: "text-amber-700",  num: "text-amber-800",  border: "border-amber-100"  },
    { bg: "bg-red-50",    text: "text-red-700",     num: "text-red-800",    border: "border-red-100"    },
  ];

  const suiviValues = [agg.suivi1, agg.suivi2, agg.suivi3, agg.suivi4];

  return (
    <div className="min-h-screen bg-white px-6 py-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Team Verification</h1>
          <p className="text-sm text-gray-400 mt-0.5">Analyse des Suivi par agent — طلبيات فريدة فقط</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Date cible</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => { setTargetDate(e.target.value); setResults([]); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-purple-400"
          />
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="text-sm text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 ${
          dragging
            ? "border-purple-400 bg-purple-50"
            : "border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/40"
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".html,.htm" multiple onChange={onFileChange} className="hidden" />
        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        {loading ? (
          <p className="text-sm text-purple-600 font-medium">Analyse en cours...</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">Glissez vos fichiers HTML ici</p>
            <p className="text-xs text-gray-400 mt-1">Plusieurs fichiers acceptés • .html / .htm</p>
          </>
        )}
      </div>

      {results.length > 0 && (
        <>
          {/* ── Aggregated KPIs ── */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Orders</p>
              <p className="text-3xl font-semibold text-gray-900">{agg.totalOrders}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-xs text-purple-500 mb-1">Avec Suivi</p>
              <p className="text-3xl font-semibold text-purple-700">{agg.withAnySuivi}</p>
              <p className="text-xs text-purple-400 mt-1">
                {agg.totalOrders > 0 ? Math.round((agg.withAnySuivi / agg.totalOrders) * 100) : 0}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Sans Suivi</p>
              <p className="text-3xl font-semibold text-gray-700">{agg.withoutSuivi}</p>
              <p className="text-xs text-gray-400 mt-1">
                {agg.totalOrders > 0 ? Math.round((agg.withoutSuivi / agg.totalOrders) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* ── Suivi 1..4 ── */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {SUIVI_LABELS.map((label, i) => (
              <div key={label} className={`${suiviColors[i].bg} border ${suiviColors[i].border} rounded-xl p-4 text-center`}>
                <p className={`text-xs font-medium mb-1 ${suiviColors[i].text}`}>{label}</p>
                <p className={`text-3xl font-semibold ${suiviColors[i].num}`}>{suiviValues[i]}</p>
                <p className={`text-xs mt-1 ${suiviColors[i].text} opacity-70`}>
                  {agg.totalOrders > 0 ? Math.round((suiviValues[i] / agg.totalOrders) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>

          {/* ── Validation ── */}
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-6 ${
            aggValid ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {aggValid ? (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  Validation ✅ — {agg.withAnySuivi} + {agg.withoutSuivi} = {agg.totalOrders}
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                </svg>
                <span>Erreur de validation — vérifiez les fichiers</span>
              </>
            )}
          </div>

          {/* ── Per-file breakdown ── */}
          <p className="text-sm font-medium text-gray-700 mb-3">Détail par fichier</p>
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Fichier</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs">Total</th>
                  <th className="text-center px-3 py-3 font-medium text-purple-500 text-xs">S1</th>
                  <th className="text-center px-3 py-3 font-medium text-teal-600 text-xs">S2</th>
                  <th className="text-center px-3 py-3 font-medium text-amber-600 text-xs">S3</th>
                  <th className="text-center px-3 py-3 font-medium text-red-500 text-xs">S4</th>
                  <th className="text-center px-3 py-3 font-medium text-purple-500 text-xs">Avec Suivi</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs">Sans</th>
                  <th className="text-center px-3 py-3 font-medium text-gray-400 text-xs">✓</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-700 font-medium max-w-[180px] truncate">
                      {r.fileName}
                    </td>
                    <td className="text-center px-3 py-3 text-gray-600 font-medium">{r.totalOrders}</td>
                    <td className="text-center px-3 py-3 text-purple-700 font-semibold">{r.suivi1}</td>
                    <td className="text-center px-3 py-3 text-teal-700 font-semibold">{r.suivi2}</td>
                    <td className="text-center px-3 py-3 text-amber-700 font-semibold">{r.suivi3}</td>
                    <td className="text-center px-3 py-3 text-red-600 font-semibold">{r.suivi4}</td>
                    <td className="text-center px-3 py-3 text-purple-600 font-semibold">{r.withAnySuivi}</td>
                    <td className="text-center px-3 py-3 text-gray-500">{r.withoutSuivi}</td>
                    <td className="text-center px-3 py-3">
                      {r.valid
                        ? <span className="text-green-500 text-base">✅</span>
                        : <span className="text-red-500 text-base">❌</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              {results.length > 1 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-500">TOTAL ({results.length} fichiers)</td>
                    <td className="text-center px-3 py-3 font-bold text-gray-800">{agg.totalOrders}</td>
                    <td className="text-center px-3 py-3 font-bold text-purple-700">{agg.suivi1}</td>
                    <td className="text-center px-3 py-3 font-bold text-teal-700">{agg.suivi2}</td>
                    <td className="text-center px-3 py-3 font-bold text-amber-700">{agg.suivi3}</td>
                    <td className="text-center px-3 py-3 font-bold text-red-600">{agg.suivi4}</td>
                    <td className="text-center px-3 py-3 font-bold text-purple-600">{agg.withAnySuivi}</td>
                    <td className="text-center px-3 py-3 font-bold text-gray-600">{agg.withoutSuivi}</td>
                    <td className="text-center px-3 py-3">
                      {aggValid ? <span className="text-green-500">✅</span> : <span className="text-red-500">❌</span>}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-300">
          <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Aucun fichier analysé</p>
        </div>
      )}
    </div>
  );
}
