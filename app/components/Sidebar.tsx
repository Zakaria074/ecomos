"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/dashboard/performance", label: "Performance & Rapports", icon: "↗" },
  { href: "/dashboard/team", label: "Team Verification", icon: "👥" },
  { href: "/dashboard/profit", label: "Profit & Loss", icon: "💰" },
  { href: "/dashboard/products", label: "Products & Ad Spend", icon: "📦" },
  { href: "/dashboard/research", label: "Product Research", icon: "🔍" },
  { href: "/dashboard/stock", label: "Stock", icon: "🏪" },
  { href: "/dashboard/whatsapp", label: "WhatsApp Automations", icon: "💬" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">E</div>
          <div>
            <div className="text-sm font-medium text-gray-900">EcomOS</div>
            <div className="text-xs text-gray-400">Internal Platform</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              pathname === item.href
                ? "bg-purple-50 text-purple-700 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-medium">A</div>
          <div>
            <div className="text-xs font-medium text-gray-900">Admin</div>
            <div className="text-xs text-gray-400">EcomOS</div>
          </div>
        </div>
      </div>
    </aside>
  );
}