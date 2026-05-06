"use client";

import { useState } from "react";

export default function CalculatorPage() {
  const [dolarRate, setDolarRate] = useState(250);
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [delivered, setDelivered] = useState("");

  const price = parseFloat(productPrice) || 0;
  const cost = parseFloat(productCost) || 0;
  const ads = parseFloat(adSpend) || 0;
  const del = parseFloat(delivered) || 0;

  const adCostPerOrder = del > 0 ? (ads / del) * dolarRate : 0;
  const profit = price - cost - adCostPerOrder;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const isProfit = profit > 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Profit Calculator</h2>
          <p className="text-sm text-gray-400 mt-0.5">Calculez votre bénéfice par commande</p>
        </div>
        {/* Dolar Rate */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2">
          <span className="text-sm">💵</span>
          <span className="text-xs font-bold text-amber-700">1$ =</span>
          <input
            type="number"
            value={dolarRate}
            onChange={e => setDolarRate(parseFloat(e.target.value) || 0)}
            className="w-16 text-sm font-black text-amber-700 bg-transparent border-none outline-none text-right"
          />
          <span className="text-xs font-bold text-amber-700">DZD</span>
        </div>
      </div>

      {/* Input Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Prix de vente */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center">
              <span className="text-sm">🏷️</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Prix de vente</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="ادخل سعر البيع"
              value={productPrice}
              onChange={e => setProductPrice(e.target.value)}
              className="w-full text-2xl font-black text-violet-600 bg-transparent outline-none border-none placeholder-gray-200"
            />
            <span className="text-sm font-bold text-gray-300">DZD</span>
          </div>
        </div>

        {/* Coût produit */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-sm">📦</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Coût produit</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="ادخل سعر الشراء"
              value={productCost}
              onChange={e => setProductCost(e.target.value)}
              className="w-full text-2xl font-black text-blue-600 bg-transparent outline-none border-none placeholder-gray-200"
            />
            <span className="text-sm font-bold text-gray-300">DZD</span>
          </div>
        </div>

        {/* Dépenses pub */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-pink-50 flex items-center justify-center">
              <span className="text-sm">📣</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dépenses pub</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder=" شحال صرف دولار"
              value={adSpend}
              onChange={e => setAdSpend(e.target.value)}
              className="w-full text-2xl font-black text-pink-600 bg-transparent outline-none border-none placeholder-gray-200"
            />
            <span className="text-sm font-bold text-gray-300">$</span>
          </div>
        </div>

        {/* Commandes livrées */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-green-50 flex items-center justify-center">
              <span className="text-sm">✅</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Livrées</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="كم طلبية موصلة"
              value={delivered}
              onChange={e => setDelivered(e.target.value)}
              className="w-full text-2xl font-black text-green-600 bg-transparent outline-none border-none placeholder-gray-200"
            />
            <span className="text-sm font-bold text-gray-300">cmd</span>
          </div>
        </div>
      </div>

      {/* Result Card */}
      {(price > 0 || cost > 0 || ads > 0 || del > 0) && (
        <div className={`rounded-2xl p-5 shadow-lg ${isProfit ? "bg-gray-950" : "bg-red-950"}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Résultat</span>
            <span className="text-lg">{isProfit ? "🤑" : "😬"}</span>
          </div>

          {/* Main result */}
          <div className="mb-4">
            <div className="text-xs text-gray-600 mb-1">Bénéfice par commande</div>
            <div className={`text-4xl font-black ${isProfit ? "text-green-400" : "text-red-400"}`}>
              {profit.toFixed(0)} <span className="text-xl">DZD</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Prix de vente</span>
              <span className="text-xs font-bold text-white">+{price.toFixed(0)} DZD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Coût produit</span>
              <span className="text-xs font-bold text-red-400">-{cost.toFixed(0)} DZD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Coût pub / commande</span>
              <span className="text-xs font-bold text-red-400">-{adCostPerOrder.toFixed(0)} DZD</span>
            </div>
          </div>

          <div className="h-px bg-gray-800 mb-3"></div>

          {/* Margin */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Marge</div>
              <div className="text-xs text-gray-700 mt-0.5">Bénéfice ÷ Prix vente</div>
            </div>
            <div className={`text-2xl font-black ${isProfit ? "text-yellow-400" : "text-red-400"}`}>
              {margin.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Formula */}
      {del > 0 && price > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Formule</p>
          <p className="text-xs text-gray-500 font-mono">
            {price} - {cost} - ({ads}÷{del}×{dolarRate}) = <span className={`font-black ${isProfit ? "text-green-600" : "text-red-600"}`}>{profit.toFixed(0)} DZD</span>
          </p>
        </div>
      )}
    </div>
  );
}