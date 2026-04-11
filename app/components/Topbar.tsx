"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/performance": "Performance & Rapports",
  "/dashboard/team": "Team Verification",
  "/dashboard/profit": "Profit & Loss",
  "/dashboard/products": "Products & Ad Spend",
  "/dashboard/research": "Product Research",
  "/dashboard/stock": "Stock",
  "/dashboard/whatsapp": "WhatsApp Automations",
};

export default function Topbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "EcomOS";

  const today = new Date().toLocaleDateString("fr-DZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
      <div className="flex-1">
        <h1 className="text-sm font-medium text-gray-900">{title}</h1>
      </div>
      <div className="text-xs text-gray-400">{today}</div>
      <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
        Exporter
      </button>
      <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer relative">
        🔔
        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
      </div>
    </header>
  );
}