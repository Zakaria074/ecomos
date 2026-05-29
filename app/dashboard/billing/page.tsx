"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TxStatus    = "Cleared" | "Declined" | "Unknown";
type TxConfirmed = "OK" | "Not Yet";

interface Transaction {
  id: string;
  date: string;
  time: string;
  platform: string;
  payCode: string;
  amount: number;
  currency: string;
  card: string;
  status: TxStatus;
  confirmed: TxConfirmed;
  duplicate: boolean;
  source: "card" | "manual";
  isDeposit: boolean;
}

interface BalanceSnapshot {
  id: string;
  label: string;
  initialBalance: number;
  startTxnId: string;
}

interface OwnerBalance {
  id: string;
  owner: "Z" | "M";
  amount: number;
  date: string;
  time: string;
}

const PLATFORM_MAP: Record<string, { label: string; color: string; bg: string }> = {
  FACEBK:    { label: "Facebook Ads", color: "text-blue-600",    bg: "bg-blue-50"    },
  FACEBOOK:  { label: "Facebook Ads", color: "text-blue-600",    bg: "bg-blue-50"    },
  GOOGLE:    { label: "Google",       color: "text-red-500",     bg: "bg-red-50"     },
  INSTAGRAM: { label: "Instagram",    color: "text-pink-500",    bg: "bg-pink-50"    },
  TIKTOK:    { label: "TikTok Ads",   color: "text-slate-700",   bg: "bg-slate-100"  },
  SHOPIFY:   { label: "Shopify",      color: "text-green-600",   bg: "bg-green-50"   },
  TEMU:      { label: "Temu",         color: "text-orange-500",  bg: "bg-orange-50"  },
  DEPOSIT:   { label: "Deposit",      color: "text-emerald-600", bg: "bg-emerald-50" },
  OTHER:     { label: "Autre",        color: "text-gray-500",    bg: "bg-gray-100"   },
};

const MONTHS: Record<string,number> = {
  jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12
};

function normalizeDateStr(s: string): string {
  const m1 = s.match(/(\w{3,9})\s+(\d{1,2})(?!\d)/i);
  if (m1) {
    const month = MONTHS[m1[1].toLowerCase().slice(0,3)];
    if (month) {
      const year = new Date().getFullYear();
      return `${year}-${String(month).padStart(2,"0")}-${String(parseInt(m1[2])).padStart(2,"0")}`;
    }
  }
  const m2 = s.match(/(\w{3,9})\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m2) {
    const month = MONTHS[m2[1].toLowerCase().slice(0,3)];
    if (month) return `${m2[3]}-${String(month).padStart(2,"0")}-${String(parseInt(m2[2])).padStart(2,"0")}`;
  }
  const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;
  return s;
}

function detectPlatform(t: string) {
  const u = t.toUpperCase();
  if (u.includes("DEPOSIT")) return "DEPOSIT";
  for (const k of Object.keys(PLATFORM_MAP)) if (k!=="OTHER"&&k!=="DEPOSIT"&&u.includes(k)) return k;
  return "OTHER";
}

function extractPayCode(t: string): string {
  const m = t.match(/\*([A-Z0-9]{6,12})/i);
  return m ? m[1].toUpperCase() : "";
}

function detectStatus(t: string): TxStatus {
  const u = t.toUpperCase();
  if (u.includes("DECLINED")) return "Declined";
  if (u.includes("CLEARED")||u.includes("SUCCESSFUL")||u.includes("SUCCESS")) return "Cleared";
  return "Unknown";
}

function formatDateInput(d: Date) { return d.toISOString().split("T")[0]; }

function parseTxnDate(s: string): Date | null {
  const norm = normalizeDateStr(s);
  const d = new Date(norm);
  return isNaN(d.getTime()) ? null : d;
}

function txnSortKey(t: Transaction): number {
  const norm = normalizeDateStr(t.date);
  const dt = t.time ? new Date(`${norm}T${t.time}`) : new Date(`${norm}T00:00:00`);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
}

function calcExpected(snap: BalanceSnapshot, transactions: Transaction[]): number {
  const idx = transactions.findIndex(t => t.id === snap.startTxnId);
  if (idx === -1) return snap.initialBalance;
  const after = transactions.slice(0, idx);
  let bal = snap.initialBalance;
  after.forEach(t => {
    if (t.status === "Declined") return;
    if (t.isDeposit) { bal += t.amount; return; }
    bal -= t.amount;
  });
  return bal;
}

function parseCardOCR(raw: string): Omit<Transaction,"id"|"confirmed"|"duplicate">[] {
  const lines = raw.split("\n").map(l=>l.trim()).filter(Boolean);
  const results: Omit<Transaction,"id"|"confirmed"|"duplicate">[] = [];
  const dateRx   = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s+\w+\s+\d+/i;
  const amountRx = /([+-]?[\d,]+\.?\d*)\s*(USD|USDT|EUR|DZD)/i;
  const cardRx   = /[•·.\u2022*oO\u25CF]{1,6}\s*(\d{4})/;
  const timeRx   = /(\d{2}:\d{2}:\d{2})/;
  let currentDate = "";
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (dateRx.test(line)) { currentDate = line; continue; }
    const amountMatch = line.match(amountRx);
    if (!amountMatch) continue;
    const rawAmt   = parseFloat(amountMatch[1].replace(",",""));
    const currency = amountMatch[2].toUpperCase();
    let platform="OTHER", payCode="", card="", time="", status:TxStatus="Unknown", isDeposit=false;
    for (let j=Math.max(0,i-5); j<=Math.min(lines.length-1,i+2); j++) {
      const l = lines[j];
      const det = detectPlatform(l); if (det!=="OTHER") platform=det;
      const pc  = extractPayCode(l); if (pc) payCode=pc;
      const cm  = l.match(cardRx);   if (cm) card=cm[1];
      const tm  = l.match(timeRx);   if (tm) time=tm[1];
      const st  = detectStatus(l);   if (st!=="Unknown") status=st;
      if (l.toUpperCase().includes("DEPOSIT")) isDeposit=true;
    }
    if (isDeposit) { platform="DEPOSIT"; if(status==="Unknown") status="Cleared"; }
    results.push({ date:currentDate, time, platform, payCode, amount:Math.abs(rawAmt), currency, card, status, source:"card", isDeposit });
  }
  return results;
}

function parseFBDocument(raw: string): {payCode:string;amount:number;card:string;date:string}[] {
  const results: {payCode:string;amount:number;card:string;date:string}[] = [];
  const codeRx   = /([A-Z][A-Z0-9]{7,11})\b/g;
  const amountRx = /\$([\d,]+\.?\d*)/g;
  const dateRx   = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s*\d{4})/g;
  const cardRx   = /Visa[^>]*?(\d{4})/g;
  const codes:   {index:number;val:string}[] = [];
  const amounts: {index:number;val:number}[] = [];
  const dates:   {index:number;val:string}[] = [];
  const cards:   {index:number;val:string}[] = [];
  let m: RegExpExecArray|null;
  while ((m=codeRx.exec(raw))!==null)   codes.push({index:m.index,val:m[1]});
  while ((m=amountRx.exec(raw))!==null) amounts.push({index:m.index,val:parseFloat(m[1].replace(",",""))});
  while ((m=dateRx.exec(raw))!==null)   dates.push({index:m.index,val:normalizeDateStr(m[1])});
  while ((m=cardRx.exec(raw))!==null)   cards.push({index:m.index,val:m[1]});
  for (const code of codes) {
    if (code.val.length<8||code.val.length>12) continue;
    if (/^\d+$/.test(code.val)) continue;
    if (!/\d/.test(code.val))   continue;
    const nearAmt  = amounts.filter(a=>a.index<code.index&&code.index-a.index<2000).at(-1);
    const nearDate = dates.filter(d=>d.index<code.index&&code.index-d.index<3000).at(-1);
    const nearCard = cards.filter(c=>c.index<code.index&&code.index-c.index<500).at(-1);
    if (!nearAmt) continue;
    results.push({ payCode:code.val, amount:nearAmt.val, date:nearDate?.val??"", card:nearCard?.val??"" });
  }
  return results.filter((e,i,arr)=>arr.findIndex(x=>x.payCode===e.payCode)===i);
}

function matchTransaction(txn:{payCode:string;amount:number;card:string;date:string}, fbEntries:{payCode:string;amount:number;card:string;date:string}[]): boolean {
  if (!txn.payCode) return false;
  const code = txn.payCode.toUpperCase();
  const txnDate = normalizeDateStr(txn.date);
  return fbEntries.some(fb => {
    const fbCode      = fb.payCode.toUpperCase();
    const codeMatch   = fbCode.includes(code.slice(0,8)) || code.includes(fbCode.slice(0,8));
    const amountMatch = !fb.amount || Math.abs(fb.amount-txn.amount)<=1.0;
    const dateMatch   = !fb.date||!txnDate||fb.date===txnDate;
    return codeMatch && amountMatch && dateMatch;
  });
}

function markDuplicates(txns: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const dupeKeys = new Set<string>();
  txns.forEach(t => {
    const dateKey = normalizeDateStr(t.date) || t.date;
    const key = `${t.amount.toFixed(2)}|${dateKey}`;
    if (seen.has(key)) dupeKeys.add(key);
    else seen.add(key);
  });
  return txns.map(t => {
    const dateKey = normalizeDateStr(t.date) || t.date;
    const key = `${t.amount.toFixed(2)}|${dateKey}`;
    return { ...t, duplicate: dupeKeys.has(key) };
  });
}

function applyMatching(txns:Transaction[], entries:{payCode:string;amount:number;card:string;date:string}[]): Transaction[] {
  return txns.map(t => {
    if (t.status==="Declined"||t.isDeposit) return t;
    const matched=matchTransaction({payCode:t.payCode,amount:t.amount,card:t.card,date:t.date},entries);
    return {...t,confirmed:matched?"OK":"Not Yet"};
  });
}

// ── Owner Balance Card ────────────────────────────────────────────────────────
function OwnerBalanceSection({ ownerBalances, setOwnerBalances }: {
  ownerBalances: OwnerBalance[];
  setOwnerBalances: React.Dispatch<React.SetStateAction<OwnerBalance[]>>;
}) {
  const [saving, setSaving] = useState<"Z"|"M"|null>(null);
  const [form, setForm] = useState<Record<"Z"|"M", {amount:string;date:string;time:string}>>({
    Z: { amount: "", date: formatDateInput(new Date()), time: "" },
    M: { amount: "", date: formatDateInput(new Date()), time: "" },
  });

  useEffect(() => {
    ownerBalances.forEach(ob => {
      setForm(prev => ({ ...prev, [ob.owner]: { amount: ob.amount.toString(), date: ob.date, time: ob.time } }));
    });
  }, [ownerBalances]);

  async function save(owner: "Z"|"M") {
    const f = form[owner];
    if (!f.amount) return;
    setSaving(owner);
    const existing = ownerBalances.find(ob => ob.owner === owner);
    const record = { id: existing?.id || `${owner}-${Date.now()}`, owner, amount: parseFloat(f.amount), date: f.date, time: f.time };
    const { error } = await supabase.from("billing_balance_tracker").upsert(record);
    if (!error) setOwnerBalances(prev => { const filtered = prev.filter(ob => ob.owner !== owner); return [...filtered, record]; });
    setSaving(null);
  }

  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {(["Z","M"] as const).map(owner => {
        const f = form[owner];
        const saved = ownerBalances.find(ob => ob.owner === owner);
        return (
          <div key={owner} className={`bg-white border rounded-2xl p-4 shadow-sm ${owner==="Z"?"border-purple-100":"border-blue-100"}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${owner==="Z"?"bg-purple-100 text-purple-700":"bg-blue-100 text-blue-700"}`}>{owner}</span>
              <span className="text-xs text-gray-500 font-medium">آخر مبلغ محسوب</span>
              {saved && <span className="ml-auto text-[10px] text-gray-400">{saved.date}{saved.time?` ${saved.time}`:""}</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <input type="number" placeholder="المبلغ" value={f.amount}
                onChange={e=>setForm(p=>({...p,[owner]:{...p[owner],amount:e.target.value}}))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-24 focus:outline-none focus:border-purple-400"/>
              <input type="date" value={f.date}
                onChange={e=>setForm(p=>({...p,[owner]:{...p[owner],date:e.target.value}}))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-400"/>
              <input type="time" value={f.time} step="1"
                onChange={e=>setForm(p=>({...p,[owner]:{...p[owner],time:e.target.value}}))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-28 focus:outline-none focus:border-purple-400"/>
              <button onClick={()=>save(owner)} disabled={saving===owner||!f.amount}
                className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 ${owner==="Z"?"bg-purple-600 hover:bg-purple-700":"bg-blue-600 hover:bg-blue-700"}`}>
                {saving===owner?<><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>حفظ...</>:"💾 حفظ"}
              </button>
            </div>
            {saved && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">محفوظ</span>
                <span className={`text-sm font-bold ${owner==="Z"?"text-purple-600":"text-blue-600"}`}>{saved.amount.toFixed(2)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Balance Tracker ───────────────────────────────────────────────────────────
function BalanceTracker({ snapshots, setSnapshots, transactions }: {
  snapshots: BalanceSnapshot[];
  setSnapshots: React.Dispatch<React.SetStateAction<BalanceSnapshot[]>>;
  transactions: Transaction[];
}) {
  const [label,      setLabel]      = useState("");
  const [bal,        setBal]        = useState("");
  const [startTxnId, setStartTxnId] = useState("");

  function add() {
    if (!bal || !startTxnId) return;
    setSnapshots(prev => [...prev, { id: Date.now().toString(), label: label || `Snapshot ${prev.length + 1}`, initialBalance: parseFloat(bal), startTxnId }]);
    setBal(""); setLabel(""); setStartTxnId("");
  }

  const selectableTxns = transactions.filter(t => !t.isDeposit && t.status !== "Declined");

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        </div>
        <span className="text-sm font-semibold text-gray-800">Balance Tracker</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <input placeholder="وصف (اختياري)" value={label} onChange={e=>setLabel(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-32 focus:outline-none focus:border-purple-400"/>
        <input placeholder="الرصيد الأولي" type="number" value={bal} onChange={e=>setBal(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-28 focus:outline-none focus:border-purple-400"/>
        <select value={startTxnId} onChange={e=>setStartTxnId(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400 max-w-[200px]">
          <option value="">اختر آخر عملية معروفة</option>
          {selectableTxns.map(t => (
            <option key={t.id} value={t.id}>{t.date}{t.time ? ` ${t.time}` : ""} — {t.payCode ? `*${t.payCode}` : t.platform} — {t.amount.toFixed(2)}</option>
          ))}
        </select>
        <button onClick={add} disabled={!bal || !startTxnId}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors">
          + إضافة
        </button>
      </div>
      {snapshots.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-3">أضف snapshot لتتبع الرصيد المتوقع</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {snapshots.map(snap => {
            const expected = calcExpected(snap, transactions);
            const diff = expected - snap.initialBalance;
            const startTxn = transactions.find(t => t.id === snap.startTxnId);
            return (
              <div key={snap.id} className="border border-gray-100 rounded-xl p-3 relative group">
                <button onClick={() => setSnapshots(prev => prev.filter(s => s.id !== snap.id))}
                  className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <p className="text-xs font-medium text-gray-700 mb-1 pr-5 truncate">{snap.label}</p>
                {startTxn && <p className="text-[10px] text-gray-400 mb-2 font-mono truncate">من: *{startTxn.payCode || startTxn.platform} — {startTxn.date}</p>}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400">الرصيد الأولي</span>
                    <span className="text-xs font-medium text-gray-600">{snap.initialBalance.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-1 flex justify-between items-center">
                    <span className="text-[10px] font-medium text-gray-500">المتوقع الآن</span>
                    <span className={`text-sm font-bold ${expected >= 0 ? "text-emerald-600" : "text-red-500"}`}>{expected.toFixed(2)}</span>
                  </div>
                  <p className={`text-[10px] text-right ${diff < 0 ? "text-red-400" : "text-emerald-500"}`}>{diff < 0 ? "▼" : "▲"} {Math.abs(diff).toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────────────────────
function ReportModal({ transactions, snapshots, ownerBalances, onClose }: {
  transactions: Transaction[];
  snapshots: BalanceSnapshot[];
  ownerBalances: OwnerBalance[];
  onClose: () => void;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const spend         = transactions.filter(t=>!t.isDeposit&&t.status!=="Declined");
  const deposits      = transactions.filter(t=>t.isDeposit);
  const totalSpend    = spend.reduce((s,t)=>s+t.amount,0);
  const totalOK       = spend.filter(t=>t.confirmed==="OK"&&!t.duplicate).reduce((s,t)=>s+t.amount,0);
  const totalNotYet   = spend.filter(t=>t.confirmed==="Not Yet").reduce((s,t)=>s+t.amount,0);
  const totalDeclined = transactions.filter(t=>t.status==="Declined").reduce((s,t)=>s+t.amount,0);
  const totalDeposited= deposits.reduce((s,t)=>s+t.amount,0);
  const balance       = totalDeposited-totalSpend;
  const byCard: Record<string,number>={}, byDate: Record<string,number>={}, byPlatform: Record<string,number>={};
  spend.filter(t=>t.confirmed==="OK"&&!t.duplicate).forEach(t=>{
    const kc=t.card?`Visa ···· ${t.card}`:"Unknown"; byCard[kc]=(byCard[kc]??0)+t.amount;
    const kd=normalizeDateStr(t.date)||t.date||"Unknown"; byDate[kd]=(byDate[kd]??0)+t.amount;
    const kp=PLATFORM_MAP[t.platform]?.label??t.platform; byPlatform[kp]=(byPlatform[kp]??0)+t.amount;
  });

  function printPDF() {
    const win=window.open("","_blank","width=800,height=900"); if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Billing Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;}body{padding:32px;color:#111;background:#fff;}
h1{font-size:20px;font-weight:700;margin-bottom:4px;}p.sub{font-size:12px;color:#888;margin-bottom:24px;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;}
.card{background:#f9fafb;border-radius:10px;padding:14px;}.card .label{font-size:11px;color:#9ca3af;margin-bottom:4px;}
.card .val{font-size:22px;font-weight:700;}.card .sub2{font-size:10px;color:#9ca3af;margin-top:2px;}
.green{color:#059669;}.red{color:#ef4444;}.amber{color:#d97706;}.purple{color:#7c3aed;}
table{width:100%;border-collapse:collapse;margin-bottom:24px;}
th{text-align:left;padding:8px 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f3f4f6;}
td{padding:8px 12px;font-size:13px;border-bottom:1px solid #f9fafb;}
.section-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin:20px 0 8px;}
@media print{body{padding:16px;}}</style></head><body>
<h1>💳 Billing Report</h1>
<p class="sub">Généré le ${new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</p>
<div class="grid">
<div class="card"><div class="label">Total Ad Spend</div><div class="val">$${totalSpend.toFixed(2)}</div><div class="sub2">toutes dépenses</div></div>
<div class="card"><div class="label">Confirmed OK</div><div class="val green">$${totalOK.toFixed(2)}</div><div class="sub2">${spend.filter(t=>t.confirmed==="OK"&&!t.duplicate).length} txns</div></div>
<div class="card"><div class="label">Not Yet</div><div class="val amber">$${totalNotYet.toFixed(2)}</div><div class="sub2">${spend.filter(t=>t.confirmed==="Not Yet").length} txns</div></div>
<div class="card"><div class="label">Declined</div><div class="val red">$${totalDeclined.toFixed(2)}</div><div class="sub2">non comptés</div></div>
<div class="card"><div class="label">Total Deposited</div><div class="val green">+$${totalDeposited.toFixed(2)}</div><div class="sub2">rechargements</div></div>
<div class="card"><div class="label">Balance</div><div class="val ${balance>=0?"green":"red"}">$${balance.toFixed(2)}</div><div class="sub2">deposited − spend</div></div>
</div>
${ownerBalances.length>0?`
<div class="section-title">Balance Tracker (Z / M)</div>
<table><tr><th>Owner</th><th>Montant</th><th>Date</th></tr>
${ownerBalances.map(ob=>`<tr><td style="font-weight:700">${ob.owner}</td><td style="font-weight:600;color:#7c3aed">${ob.amount.toFixed(2)}</td><td>${ob.date}${ob.time?` ${ob.time}`:""}</td></tr>`).join("")}
</table>`:""}
${snapshots.length>0?`
<div class="section-title">Balance Snapshots</div>
<table><tr><th>Label</th><th style="text-align:right">Rصيد أولي</th></tr>
${snapshots.map(s=>`<tr><td>${s.label}</td><td style="text-align:right;font-weight:600">${s.initialBalance.toFixed(2)}</td></tr>`).join("")}
</table>`:""}
<div class="section-title">Par Plateforme (OK)</div>
<table><tr><th>Plateforme</th><th style="text-align:right">Montant</th></tr>
${Object.entries(byPlatform).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right;font-weight:600">$${v.toFixed(2)}</td></tr>`).join("")}
</table>
<div class="section-title">Par Carte (OK)</div>
<table><tr><th>Carte</th><th style="text-align:right">Montant</th></tr>
${Object.entries(byCard).map(([k,v])=>`<tr><td style="font-family:monospace">${k}</td><td style="text-align:right;font-weight:600">$${v.toFixed(2)}</td></tr>`).join("")}
</table>
<div class="section-title">Par Date (OK)</div>
<table><tr><th>Date</th><th style="text-align:right">Montant</th></tr>
${Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right;font-weight:600">$${v.toFixed(2)}</td></tr>`).join("")}
</table>
<div class="section-title">Toutes les transactions</div>
<table><tr><th>Date</th><th>Plateforme</th><th>Code</th><th>Carte</th><th style="text-align:right">Montant</th><th>Status</th><th>Confirmed</th></tr>
${transactions.map(t=>`<tr style="${t.duplicate?"color:#f97316":t.status==="Declined"?"color:#ef4444;text-decoration:line-through":t.isDeposit?"color:#059669":""}">
<td>${t.date}${t.time?` ${t.time}`:""}</td><td>${PLATFORM_MAP[t.platform]?.label??t.platform}</td>
<td style="font-family:monospace">${t.isDeposit?"Deposit":t.payCode?`*${t.payCode}`:"—"}</td>
<td style="font-family:monospace">${t.card?`···· ${t.card}`:"—"}</td>
<td style="text-align:right;font-weight:600">${t.isDeposit?"+":"-"}${t.amount.toFixed(2)} ${t.currency}</td>
<td>${t.isDeposit?"Deposit":t.status}</td><td>${t.isDeposit||t.status==="Declined"?"—":t.confirmed}</td>
</tr>`).join("")}
</table></body></html>`);
    win.document.close(); setTimeout(()=>{win.focus();win.print();},500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.3)"}} onClick={onClose}>
      <div ref={reportRef} className="bg-white rounded-2xl w-[580px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-sm font-semibold text-gray-900">📊 Rapport Global</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printPDF} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              تحميل PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:"Total Ad Spend",  value:`$${totalSpend.toFixed(2)}`,     color:"text-gray-900",    bg:"bg-gray-50",    sub:"toutes dépenses"},
              {label:"Confirmed OK",    value:`$${totalOK.toFixed(2)}`,         color:"text-green-700",   bg:"bg-green-50",   sub:`${spend.filter(t=>t.confirmed==="OK"&&!t.duplicate).length} txns`},
              {label:"Not Yet",         value:`$${totalNotYet.toFixed(2)}`,     color:"text-amber-600",   bg:"bg-amber-50",   sub:`${spend.filter(t=>t.confirmed==="Not Yet").length} txns`},
              {label:"Declined",        value:`$${totalDeclined.toFixed(2)}`,   color:"text-red-500",     bg:"bg-red-50",     sub:"non comptés"},
              {label:"Total Deposited", value:`+$${totalDeposited.toFixed(2)}`, color:"text-emerald-600", bg:"bg-emerald-50", sub:"rechargements"},
              {label:"Balance",         value:`$${balance.toFixed(2)}`,         color:balance>=0?"text-emerald-600":"text-red-500",bg:balance>=0?"bg-emerald-50":"bg-red-50",sub:"deposited − spend"},
            ].map(s=>(
              <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                <p className="text-[11px] text-gray-400 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>
          {ownerBalances.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Balance Tracker</p>
              <div className="grid grid-cols-2 gap-3">
                {ownerBalances.map(ob => (
                  <div key={ob.owner} className={`rounded-xl p-3 ${ob.owner==="Z"?"bg-purple-50":"bg-blue-50"}`}>
                    <p className={`text-xs font-bold mb-1 ${ob.owner==="Z"?"text-purple-700":"text-blue-700"}`}>{ob.owner}</p>
                    <p className={`text-xl font-bold ${ob.owner==="Z"?"text-purple-700":"text-blue-700"}`}>{ob.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{ob.date}{ob.time?` ${ob.time}`:""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {([
            {title:"Par plateforme (OK)",data:byPlatform,mono:false,sort:false},
            {title:"Par carte (OK)",     data:byCard,    mono:true, sort:false},
            {title:"Par date (OK)",      data:byDate,    mono:false,sort:true },
          ] as const).map(sec=>(
            <div key={sec.title}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{sec.title}</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {Object.keys(sec.data).length===0
                  ? <p className="text-xs text-gray-300 text-center py-4">Aucune donnée</p>
                  : (sec.sort?Object.entries(sec.data).sort((a,b)=>a[0].localeCompare(b[0])):Object.entries(sec.data))
                    .map(([k,v])=>(
                      <div key={k} className="flex justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <span className={`text-sm text-gray-700 ${sec.mono?"font-mono":""}`}>{k}</span>
                        <span className="text-sm font-semibold text-gray-900">${(v as number).toFixed(2)}</span>
                      </div>
                    ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Inline Edit Row ───────────────────────────────────────────────────────────
function EditRow({ txn, onSave, onCancel }: { txn: Transaction; onSave: (t: Transaction) => void; onCancel: () => void }) {
  const [f, setF] = useState({ ...txn });
  const u = (k: keyof Transaction, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <tr className="border-b border-purple-100 bg-purple-50/30">
      <td className="px-3 py-2" colSpan={8}>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={f.date} onChange={e=>u("date",e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 w-32"/>
          <input type="time" value={f.time} onChange={e=>u("time",e.target.value)} step="1" className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 w-28"/>
          <select value={f.platform} onChange={e=>{ u("platform",e.target.value); u("isDeposit",e.target.value==="DEPOSIT"); }} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400">
            {Object.keys(PLATFORM_MAP).map(k=><option key={k} value={k}>{PLATFORM_MAP[k].label}</option>)}
          </select>
          <input placeholder="كود الدفع" value={f.payCode} onChange={e=>u("payCode",e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 w-28 font-mono"/>
          <input placeholder="كارت" value={f.card} onChange={e=>u("card",e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 w-16 font-mono"/>
          <input type="number" placeholder="المبلغ" value={f.amount} onChange={e=>u("amount",parseFloat(e.target.value)||0)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400 w-24"/>
          <select value={f.status} onChange={e=>u("status",e.target.value as TxStatus)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-400">
            <option value="Cleared">✓ Cleared</option>
            <option value="Declined">✕ Declined</option>
            <option value="Unknown">? Unknown</option>
          </select>
          <div className="flex gap-1 ml-auto">
            <button onClick={()=>onSave(f)} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors">حفظ</button>
            <button onClick={onCancel} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors">إلغاء</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BillingTrackerPage() {
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [snapshots,      setSnapshots]      = useState<BalanceSnapshot[]>([]);
  const [ownerBalances,  setOwnerBalances]  = useState<OwnerBalance[]>([]);
  const [fbEntries,      setFbEntries]      = useState<{payCode:string;amount:number;card:string;date:string}[]>([]);
  const [fbLoaded,       setFbLoaded]       = useState(false);
  const [showReport,     setShowReport]     = useState(false);
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState<"all"|"OK"|"Not Yet"|"Declined">("all");
  const [scanning,       setScanning]       = useState(false);
  const [scanMsg,        setScanMsg]        = useState("");
  const [previewUrls,    setPreviewUrls]    = useState<string[]>([]);
  const [showDupes,      setShowDupes]      = useState(true);
  const [editingId,      setEditingId]      = useState<string|null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm,     setManualForm]     = useState({ isDeposit: false, amount: "", date: formatDateInput(new Date()), time: "", platform: "FACEBK", payCode: "", card: "" });
  const cardFileRef = useRef<HTMLInputElement>(null);
  const fbFileRef   = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    try {
      const s=localStorage.getItem("billing_txns3"); if(s) setTransactions(JSON.parse(s));
      const sn=localStorage.getItem("billing_snapshots"); if(sn) setSnapshots(JSON.parse(sn));
    } catch {}
    supabase.from("billing_balance_tracker").select("*").then(({data})=>{ if(data) setOwnerBalances(data as OwnerBalance[]); });
  },[]);

  useEffect(()=>{ localStorage.setItem("billing_txns3",JSON.stringify(transactions)); },[transactions]);
  useEffect(()=>{ localStorage.setItem("billing_snapshots",JSON.stringify(snapshots)); },[snapshots]);
  useEffect(()=>{ const t=formatDateInput(new Date()); setDateFrom(t); setDateTo(t); },[]);

  function submitManual() {
    if (!manualForm.amount) return;
    const isDeposit = manualForm.isDeposit;
    const t: Transaction = {
      id: Date.now().toString() + Math.random(),
      date: manualForm.date, time: manualForm.time,
      platform: isDeposit ? "DEPOSIT" : manualForm.platform,
      payCode: manualForm.payCode.toUpperCase(),
      amount: parseFloat(manualForm.amount), currency: "USD",
      card: manualForm.card, status: "Cleared", confirmed: "Not Yet",
      duplicate: false, source: "manual", isDeposit,
    };
    setTransactions(prev => markDuplicates([t, ...prev]));
    setShowManualForm(false);
    setManualForm({ isDeposit: false, amount: "", date: formatDateInput(new Date()), time: "", platform: "FACEBK", payCode: "", card: "" });
  }

  async function handleCardFiles(files: FileList|null) {
    if (!files?.length) return;
    setScanning(true); setScanMsg("تحميل Tesseract...");
    try {
      // @ts-ignore
      const Tesseract=(await import("tesseract.js")).default;
      const newTxns:Transaction[]=[]; const urls:string[]=[];
      for (let i=0;i<files.length;i++) {
        setScanMsg(`قراءة الصورة ${i+1} / ${files.length}...`);
        urls.push(URL.createObjectURL(files[i]));
        const {data:{text}}=await Tesseract.recognize(files[i],"eng",{logger:()=>{}});
        parseCardOCR(text).forEach(t=>{
          const confirmed:TxConfirmed=(t.isDeposit||t.status==="Declined")?"Not Yet"
            :(fbEntries.length>0&&matchTransaction({payCode:t.payCode,amount:t.amount,card:t.card,date:t.date},fbEntries)?"OK":"Not Yet");
          newTxns.push({...t,id:Date.now().toString()+Math.random(),confirmed,duplicate:false});
        });
      }
      setPreviewUrls(urls);
      if (newTxns.length>0) {
        setTransactions(prev=>{
          const existing=new Set(prev.map(t=>`${normalizeDateStr(t.date)}|${t.time}|${t.amount}|${t.platform}`));
          const fresh=newTxns.filter(t=>!existing.has(`${normalizeDateStr(t.date)}|${t.time}|${t.amount}|${t.platform}`));
          return markDuplicates([...fresh,...prev]);
        });
        setScanMsg(`✓ ${newTxns.length} transaction${newTxns.length>1?"s":""} extraite${newTxns.length>1?"s":""}`);
      } else setScanMsg("⚠️ ما قدر يقرأ — تحقق من الصورة");
    } catch { setScanMsg("❌ خطأ في القراءة"); }
    setScanning(false); setTimeout(()=>setScanMsg(""),4000);
  }

  async function handleFBFiles(files: FileList|null) {
    if (!files?.length) return;
    setScanMsg("قراءة ملف Facebook...");
    try {
      let allEntries:typeof fbEntries=[];
      for (let i=0;i<files.length;i++) {
        const file=files[i]; let text="";
        if (file.name.endsWith(".pdf")) {
          // @ts-ignore
          const pdfjsLib=await import("pdfjs-dist/legacy/build/pdf");
          pdfjsLib.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          const arrayBuffer=await file.arrayBuffer();
          const pdf=await pdfjsLib.getDocument({data:arrayBuffer}).promise;
          for (let p=1;p<=pdf.numPages;p++) {
            const page=await pdf.getPage(p);
            const content=await page.getTextContent();
            text+=content.items.map((item:any)=>item.str).join(" ")+"\n";
          }
        } else { text=await file.text(); }
        allEntries=[...allEntries,...parseFBDocument(text)];
      }
      const unique=allEntries.filter((e,i,arr)=>arr.findIndex(x=>x.payCode===e.payCode)===i);
      setFbEntries(unique); setFbLoaded(true);
      setTransactions(prev=>markDuplicates(applyMatching(prev,unique)));
      setScanMsg(`✓ ${unique.length} codes Facebook`);
    } catch(e) { console.error(e); setScanMsg("❌ خطأ في قراءة الملف"); }
    setTimeout(()=>setScanMsg(""),4000);
  }

  const spendTxns     = transactions.filter(t=>!t.isDeposit&&t.status!=="Declined");
  const declinedTxns  = transactions.filter(t=>t.status==="Declined");
  const totalSpend    = spendTxns.filter(t=>t.confirmed==="OK"&&!t.duplicate).reduce((s,t)=>s+t.amount,0);
  const totalDeposit  = transactions.filter(t=>t.isDeposit).reduce((s,t)=>s+t.amount,0);
  const fbSpend       = spendTxns.filter(t=>(t.platform==="FACEBK"||t.platform==="FACEBOOK")&&t.confirmed==="OK"&&!t.duplicate).reduce((s,t)=>s+t.amount,0);
  const notYetCount   = spendTxns.filter(t=>t.confirmed==="Not Yet").length;
  const declinedCount = declinedTxns.length;
  const declinedAmt   = declinedTxns.reduce((s,t)=>s+t.amount,0);
  const dupCount      = transactions.filter(t=>t.duplicate).length;
  const balance       = totalDeposit-totalSpend;

  const sortedTransactions = [...transactions].sort((a,b) => txnSortKey(b) - txnSortKey(a));

  const filtered = sortedTransactions.filter(t=>{
    const d=parseTxnDate(t.date);
    if (d&&dateFrom&&dateTo) {
      const from=new Date(dateFrom),to=new Date(dateTo); to.setHours(23,59,59);
      if (d<from||d>to) return false;
    }
    if (statusFilter==="OK")       return t.confirmed==="OK"&&t.status!=="Declined"&&!t.isDeposit;
    if (statusFilter==="Not Yet")  return t.confirmed==="Not Yet"&&t.status!=="Declined"&&!t.isDeposit;
    if (statusFilter==="Declined") return t.status==="Declined";
    return true;
  }).filter(t=>showDupes?true:!t.duplicate);

  function updateTxn(id:string,field:keyof Transaction,value:any) {
    setTransactions(prev=>markDuplicates(prev.map(t=>t.id===id?{...t,[field]:value}:t)));
  }

  function saveTxn(updated: Transaction) {
    setTransactions(prev => markDuplicates(prev.map(t => t.id === updated.id ? updated : t)));
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-white">
      {showReport&&<ReportModal transactions={transactions} snapshots={snapshots} ownerBalances={ownerBalances} onClose={()=>setShowReport(false)}/>}

      <div className="px-6 pt-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">💳 Billing Tracker</h1>
            <p className="text-sm text-gray-400 mt-0.5">رفع صور الكارت + Facebook · مطابقة بالتاريخ والكود والمبلغ</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={()=>setShowReport(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              📊 Rapport PDF
            </button>
            <button onClick={()=>{ setShowManualForm(v=>!v); setEditingId(null); }}
              className={`px-3 py-2 border text-sm font-medium rounded-xl transition-colors ${showManualForm?"bg-purple-50 border-purple-300 text-purple-700":"border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
              + يدوي
            </button>
            <button onClick={()=>cardFileRef.current?.click()} disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
              {scanning?<><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>جاري...</>
                :<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>📸 صور الكارت</>}
            </button>
            <button onClick={()=>fbFileRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors border ${fbLoaded?"bg-blue-50 border-blue-200 text-blue-700":"bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              🔵 Facebook PDF / HTML
              {fbLoaded?<span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">✓ {fbEntries.length} codes</span>
                :<span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">لا يوجد</span>}
            </button>
            <input ref={cardFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>handleCardFiles(e.target.files)}/>
            <input ref={fbFileRef}   type="file" accept=".html,.htm,.mhtml,.pdf,.txt" multiple className="hidden" onChange={e=>handleFBFiles(e.target.files)}/>
          </div>
        </div>

        {showManualForm && (
          <div className="mb-4 p-4 bg-white border border-purple-100 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-gray-700 mb-3">إضافة معاملة يدوية</p>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button onClick={()=>setManualForm(p=>({...p,isDeposit:false}))} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!manualForm.isDeposit?"bg-white text-gray-900 shadow-sm":"text-gray-400"}`}>Cleared</button>
                <button onClick={()=>setManualForm(p=>({...p,isDeposit:true,platform:"DEPOSIT"}))} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${manualForm.isDeposit?"bg-emerald-500 text-white shadow-sm":"text-gray-400"}`}>Deposit</button>
              </div>
              <input type="number" placeholder="المبلغ *" value={manualForm.amount} onChange={e=>setManualForm(p=>({...p,amount:e.target.value}))} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-24 focus:outline-none focus:border-purple-400"/>
              <input type="date" value={manualForm.date} onChange={e=>setManualForm(p=>({...p,date:e.target.value}))} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-400"/>
              <input type="time" value={manualForm.time} onChange={e=>setManualForm(p=>({...p,time:e.target.value}))} step="1" className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-400 w-28"/>
              {!manualForm.isDeposit && <>
                <select value={manualForm.platform} onChange={e=>setManualForm(p=>({...p,platform:e.target.value}))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400">
                  {Object.entries(PLATFORM_MAP).filter(([k])=>k!=="DEPOSIT").map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <input placeholder="كود الدفع" value={manualForm.payCode} onChange={e=>setManualForm(p=>({...p,payCode:e.target.value.toUpperCase()}))} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-28 font-mono focus:outline-none focus:border-purple-400"/>
                <input placeholder="كارت" value={manualForm.card} onChange={e=>setManualForm(p=>({...p,card:e.target.value}))} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-16 font-mono focus:outline-none focus:border-purple-400"/>
              </>}
              <button onClick={submitManual} disabled={!manualForm.amount} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors">إضافة</button>
              <button onClick={()=>setShowManualForm(false)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition-colors">إلغاء</button>
            </div>
          </div>
        )}

        {scanMsg&&(
          <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${scanMsg.startsWith("✓")?"bg-green-50 text-green-700 border border-green-100":scanMsg.startsWith("⚠")?"bg-amber-50 text-amber-700 border border-amber-100":scanMsg.startsWith("❌")?"bg-red-50 text-red-700 border border-red-100":"bg-blue-50 text-blue-700 border border-blue-100"}`}>{scanMsg}</div>
        )}

        {/* OWNER BALANCE */}
        <OwnerBalanceSection ownerBalances={ownerBalances} setOwnerBalances={setOwnerBalances}/>

        {/* BALANCE TRACKER */}
        <BalanceTracker snapshots={snapshots} setSnapshots={setSnapshots} transactions={transactions}/>

        {/* DATE FILTER */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex-wrap">
          <span className="text-xs font-medium text-gray-500">📅 فيلتر</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">من</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-purple-400"/>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">إلى</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-purple-400"/>
          </div>
          <div className="flex gap-1">
            {(["اليوم","أمس","7 أيام"] as const).map((label,i)=>(
              <button key={label} onClick={()=>{ const d=new Date(); if(i===1) d.setDate(d.getDate()-1); const from=new Date(d); if(i===2) from.setDate(from.getDate()-6); setDateTo(formatDateInput(d)); setDateFrom(formatDateInput(from)); }}
                className="px-2.5 py-1 text-[11px] font-medium bg-white border border-gray-200 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-all">{label}</button>
            ))}
          </div>
          {dupCount>0&&(
            <button onClick={()=>setShowDupes(!showDupes)} className={`ml-auto px-3 py-1 text-[11px] font-medium rounded-lg border transition-all ${showDupes?"bg-orange-50 border-orange-200 text-orange-600":"bg-white border-gray-200 text-gray-400"}`}>
              {showDupes?`⚠️ ${dupCount} doublons`:`👁 Afficher doublons`}
            </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          {[
            {label:"Total OK",  value:`$${totalSpend.toFixed(2)}`,    sub:"ad spend",                        color:"text-gray-900",    bg:"bg-gray-50"   },
            {label:"Facebook",  value:`$${fbSpend.toFixed(2)}`,       sub:"OK only",                         color:"text-blue-600",    bg:"bg-blue-50"   },
            {label:"Deposited", value:`+$${totalDeposit.toFixed(2)}`, sub:"rechargé",                        color:"text-emerald-600", bg:"bg-emerald-50"},
            {label:"Balance",   value:`$${balance.toFixed(2)}`,       sub:"dep − spend",                     color:balance>=0?"text-emerald-600":"text-red-500",bg:balance>=0?"bg-emerald-50":"bg-red-50"},
            {label:"Not Yet",   value:notYetCount.toString(),         sub:"à vérifier",                      color:"text-amber-600",   bg:"bg-amber-50"  },
            {label:"Declined",  value:declinedCount.toString(),       sub:`$${declinedAmt.toFixed(2)} exclus`,color:"text-red-500",    bg:"bg-red-50"    },
          ].map(s=>(
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
              <p className="text-[11px] text-gray-400 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="px-6 pb-8 flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={()=>setStatusFilter("all")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter==="all"?"bg-white text-gray-900 shadow-sm":"text-gray-400 hover:text-gray-600"}`}>Tout ({transactions.length})</button>
              <button onClick={()=>setStatusFilter("OK")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter==="OK"?"bg-white text-gray-900 shadow-sm":"text-gray-400 hover:text-gray-600"}`}>✅ OK ({spendTxns.filter(t=>t.confirmed==="OK").length})</button>
              <button onClick={()=>setStatusFilter("Not Yet")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter==="Not Yet"?"bg-white text-gray-900 shadow-sm":"text-gray-400 hover:text-gray-600"}`}>⏳ Not Yet ({notYetCount})</button>
              <button onClick={()=>setStatusFilter("Declined")} className={`relative flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter==="Declined"?"bg-white text-gray-900 shadow-sm":"text-gray-400 hover:text-gray-600"}`}>
                ❌ Declined
                {declinedCount>0&&<span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold transition-all ${statusFilter==="Declined"?"bg-red-500 text-white":"bg-red-100 text-red-600"}`}>{declinedCount}</span>}
              </button>
            </div>
            {transactions.length>0&&<button onClick={()=>{if(confirm("مسح كل البيانات؟"))setTransactions([]);}} className="text-xs text-gray-400 hover:text-red-500 transition-colors">مسح الكل</button>}
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">التاريخ</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">المنصة</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">كود الدفع</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">كارت</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-400">المبلغ</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400">Status</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-400">Confirmed</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0?(
                  <tr><td colSpan={8} className="text-center py-16 text-gray-300"><p className="text-sm">ارفع صور الكارت للبدء</p></td></tr>
                ):filtered.map(txn=>{
                  const info=PLATFORM_MAP[txn.platform]??PLATFORM_MAP["OTHER"];
                  if (editingId === txn.id) return <EditRow key={txn.id} txn={txn} onSave={saveTxn} onCancel={()=>setEditingId(null)}/>;
                  return (
                    <tr key={txn.id} onClick={()=>setEditingId(txn.id)}
                      className={`border-b border-gray-50 transition-colors cursor-pointer ${txn.duplicate?"bg-orange-50/60 hover:bg-orange-50":txn.status==="Declined"?"bg-red-50/40 hover:bg-red-50/60":txn.isDeposit?"bg-emerald-50/40 hover:bg-emerald-50/60":"hover:bg-gray-50/50"}`}>
                      <td className="px-3 py-3">
                        <p className="text-xs text-gray-700 font-medium">{txn.date}</p>
                        {txn.time&&<p className="text-[11px] text-gray-400 font-mono">{txn.time}</p>}
                        {txn.duplicate&&<span className="text-[10px] text-orange-500 font-semibold">⚠️ doublon</span>}
                      </td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${info.bg} ${info.color}`}>{info.label}</span></td>
                      <td className="px-3 py-3">
                        {txn.isDeposit?<span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">Deposit</span>
                          :<span className="text-xs font-mono font-semibold text-gray-700">{txn.payCode?`*${txn.payCode}`:"—"}</span>}
                      </td>
                      <td className="px-3 py-3"><span className="text-xs text-gray-500 font-mono">{txn.card?`···· ${txn.card}`:"—"}</span></td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-semibold ${txn.isDeposit?"text-emerald-600":txn.status==="Declined"?"text-red-400 line-through":"text-gray-800"}`}>
                          {txn.isDeposit?"+":"-"}{txn.amount.toFixed(2)} {txn.currency}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center" onClick={e=>e.stopPropagation()}>
                        {txn.isDeposit?<span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600">↑ Deposit</span>
                          :<span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${txn.status==="Cleared"?"bg-green-50 text-green-600":txn.status==="Declined"?"bg-red-50 text-red-500":"bg-gray-100 text-gray-400"}`}>
                            {txn.status==="Cleared"?"✓ Cleared":txn.status==="Declined"?"✕ Declined":"? Unknown"}
                          </span>}
                      </td>
                      <td className="px-3 py-3 text-center" onClick={e=>e.stopPropagation()}>
                        {txn.isDeposit||txn.status==="Declined"?<span className="text-xs text-gray-300">—</span>
                          :<select value={txn.confirmed} onChange={e=>updateTxn(txn.id,"confirmed",e.target.value as TxConfirmed)}
                            className={`text-xs font-semibold rounded-lg px-2 py-1 border focus:outline-none cursor-pointer transition-all ${txn.confirmed==="OK"?"bg-green-50 text-green-700 border-green-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>
                            <option value="OK">✅ OK</option>
                            <option value="Not Yet">⏳ Not Yet</option>
                          </select>}
                      </td>
                      <td className="px-3 py-3" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setTransactions(prev=>markDuplicates(prev.filter(t=>t.id!==txn.id)))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {previewUrls.length>0&&(
          <div className="w-56 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">الصور</p>
              <button onClick={()=>setPreviewUrls([])} className="text-[11px] text-gray-300 hover:text-gray-500">مسح</button>
            </div>
            {previewUrls.map((url,i)=>(
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <img src={url} alt={`preview ${i+1}`} className="w-full object-contain max-h-48"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}