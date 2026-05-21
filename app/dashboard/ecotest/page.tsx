"use client";

import { useState } from "react";

function today() { return new Date().toISOString().split("T")[0]; }

export default function TastPage() {
  const [date,    setDate]    = useState(today());
  const [loading, setLoading] = useState(false);
  const [count,   setCount]   = useState<number | null>(null);
  const [error,   setError]   = useState("");

  async function fetchDelivered() {
    setLoading(true); setError(""); setCount(null);
    try {
      const res  = await fetch(`/api/eco/delivered?date=${date}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setCount(json.count);
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Commandes livrées</h1>
        <p className="text-sm text-gray-400 mt-1">Eco Manager · {date}</p>
      </div>
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setCount(null); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-purple-400"/>
        <button onClick={fetchDelivered} disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
          {loading ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>جاري...</> : "جلب"}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">❌ {error}</p>}
      {count !== null && (
        <div className="bg-green-50 border border-green-100 rounded-3xl px-24 py-12 text-center">
          <p className="text-sm text-green-600 uppercase tracking-widest mb-3">Livrées</p>
          <p className="text-8xl font-bold text-green-700">{count}</p>
          <p className="text-sm text-green-500 mt-3">commandes · {date}</p>
        </div>
      )}
    </div>
  );
}
