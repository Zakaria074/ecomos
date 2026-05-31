"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface StatItem { label: string; value: string; auto?: boolean; }
interface TeamIssue { problem: string; solution: string; }
interface TeamSection { name: string; emoji: string; color: string; issues: TeamIssue[]; }

function normalizeDateStr(s: string): string {
  const MONTHS: Record<string,number> = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const m1 = s.match(/(?:\w+,?\s+)?(\w{3,9})\s+(\d{1,2})/i);
  if (m1) {
    const mo = MONTHS[m1[1].toLowerCase().slice(0,3)];
    if (mo) return `${new Date().getFullYear()}-${String(mo).padStart(2,"0")}-${String(parseInt(m1[2])).padStart(2,"0")}`;
  }
  const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;
  return s;
}

export default function RapportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [reportDay, setReportDay] = useState("");
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [dollarRate, setDollarRate] = useState("");
  const [notes, setNotes] = useState("");
  const [teams, setTeams] = useState<TeamSection[]>([
    { name: "فريق اللوجستيك", emoji: "🚚", color: "#6d28d9", issues: [{ problem: "", solution: "" }] },
    { name: "فريق التتبع",    emoji: "📦", color: "#0891b2", issues: [{ problem: "", solution: "" }] },
    { name: "فريق التأكيد",   emoji: "✅", color: "#059669", issues: [{ problem: "", solution: "" }] },
  ]);
  const [stats, setStats] = useState<StatItem[]>([
    { label: "مرسلة",                          value: "" },
    { label: "موصلة",                          value: "" },
    { label: "عائد",                           value: "" },
    { label: "نسبة الكفاءة الحضورية",          value: "" },
    { label: "نسبة التوصيل الأسبوع الفائت",   value: "" },
    { label: "نسبة التأكيد الأسبوع الفائت",   value: "" },
    { label: "Total Ad Spend",                 value: "", auto: true },
    { label: "Cost per Delivered",             value: "", auto: true },
    { label: "Cost per Delivered (DZD)",       value: "", auto: true },
  ]);
  const [alertText, setAlertText] = useState("");

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    async function fetchSpend() {
      try {
        const [metaRes, ttRes] = await Promise.all([
          fetch(`/api/meta?date_from=${dateFrom}&date_to=${dateTo}`).then(r => r.json()),
          fetch(`/api/tiktok?date_from=${dateFrom}&date_to=${dateTo}`).then(r => r.json()),
        ]);
        const fbSpend = (metaRes as any[]).reduce((s: number, a: any) => s + parseFloat(a.summary?.spend || "0"), 0);
        const ttSpend = parseFloat((ttRes as any).summary?.spend || "0");
        const spend = fbSpend + ttSpend;
        const morsala = parseFloat(stats[1].value) || 0;
        const cpd = morsala > 0 ? spend / morsala : 0;
        const rate = parseFloat(dollarRate) || 0;
        const cpdDzd = cpd * rate;
        setStats(prev => prev.map((s, i) => {
          if (i === 6) return { ...s, value: spend > 0 ? spend.toFixed(2) : "" };
          if (i === 7) return { ...s, value: cpd > 0 ? cpd.toFixed(2) : "" };
          if (i === 8) return { ...s, value: cpdDzd > 0 ? cpdDzd.toFixed(2) : "" };
          return s;
        }));
      } catch (e) { console.error(e); }
    }
    fetchSpend();
  }, [fetchTrigger, stats[0].value, dollarRate]);

  function updateStat(i: number, val: string) {
    setStats(prev => prev.map((s, idx) => idx === i ? { ...s, value: val } : s));
  }

  function updateIssue(ti: number, ii: number, field: "problem"|"solution", val: string) {
    setTeams(prev => prev.map((t, tidx) => tidx !== ti ? t : {
      ...t, issues: t.issues.map((iss, iidx) => iidx !== ii ? iss : { ...iss, [field]: val })
    }));
  }

  function addIssue(ti: number) {
    setTeams(prev => prev.map((t, tidx) => tidx !== ti ? t : { ...t, issues: [...t.issues, { problem: "", solution: "" }] }));
  }

  function removeIssue(ti: number, ii: number) {
    setTeams(prev => prev.map((t, tidx) => tidx !== ti ? t : { ...t, issues: t.issues.filter((_, iidx) => iidx !== ii) }));
  }

function buildPDFStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Tajawal',sans-serif;background:#fff;color:#111827;direction:rtl;}
    .page{max-width:840px;margin:0 auto;padding:52px 56px;min-height:100vh;}
    .header{margin-bottom:36px;}
    .header-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
    .badge{display:inline-block;background:#111827;color:#fff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:4px;letter-spacing:2px;text-transform:uppercase;}
    .header-right{text-align:left;}
    .header-right .dates{font-size:12px;font-weight:700;color:#6d28d9;}
    .header-right .day{font-size:11px;color:#9ca3af;margin-top:3px;}
    h1{font-size:40px;font-weight:900;color:#111827;letter-spacing:-2px;line-height:1;margin-bottom:4px;}
    .header-sub{font-size:13px;color:#9ca3af;margin-bottom:20px;}
    .header-line{height:3px;background:linear-gradient(90deg,#6d28d9 0%,#a78bfa 50%,transparent 100%);border-radius:2px;}
    .section{margin-bottom:32px;}
    .section-title{font-size:10px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
    .section-title::after{content:"";flex:1;height:1px;background:#e5e7eb;}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
    .stat{padding:14px 16px;border-radius:8px;border:1px solid #e5e7eb;position:relative;overflow:hidden;}
    .stat::before{content:"";position:absolute;top:0;right:0;width:3px;height:100%;background:#6d28d9;}
    .stat.auto::before{background:#a78bfa;}
    .stat-label{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
    .stat-value{font-size:24px;font-weight:900;color:#111827;line-height:1;}
    .stat-unit{font-size:12px;font-weight:400;color:#9ca3af;margin-right:3px;}
    .alert-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-top:16px;}
    .alert-label{font-size:9px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
    .alert-text{font-size:12px;color:#92400e;line-height:1.9;}
    .issue{margin-bottom:10px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;}
    .issue-top{padding:11px 14px;display:flex;align-items:flex-start;gap:10px;background:#fafafa;}
    .issue-num{min-width:22px;height:22px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex-shrink:0;margin-top:1px;}
    .issue-problem{font-size:13px;font-weight:600;color:#111827;flex:1;line-height:1.7;}
    .issue-bottom{padding:10px 14px 10px 46px;background:#f0fdf4;border-top:1px solid #dcfce7;}
    .sol-label{font-size:9px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
    .sol-text{font-size:12px;color:#166534;line-height:1.8;}
    .notes-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:13px;color:#374151;line-height:2;}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:56px;padding-top:20px;border-top:1px dashed #e5e7eb;}
    .sig{text-align:center;}
    .sig-space{height:48px;}
    .sig-line{border-top:1px solid #d1d5db;padding-top:8px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:1px;}
    .page-break{page-break-before:always;}
    @media print{.page{padding:36px 44px;}}
  `;
}

function buildStatsHTML() {
  const filledStats = stats.filter(s => s.value && s.value !== "—");
  if (!filledStats.length) return "";
  return `
    <div class="section">
      <div class="section-title">📊 إحصائيات عامة</div>
      <div class="stats-grid">
        ${filledStats.map(s => `
          <div class="stat ${s.auto ? "auto" : ""}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}<span class="stat-unit">${s.label.includes("DZD") ? "دج" : s.label.includes("Spend") || s.label.includes("Cost") ? "$" : s.label.includes("نسبة") ? "%" : ""}</span></div>
          </div>
        `).join("")}
      </div>
      ${alertText ? `
        <div class="alert-box">
          <div class="alert-label">⚠️ تنبيهات وملاحظات عامة</div>
          <div class="alert-text">${alertText.replace(/\n/g,"<br/>")}</div>
        </div>
      ` : ""}
    </div>
  `;
}

 function buildTeamHTML(team: TeamSection) {
  const filled = team.issues.filter(iss => iss.problem);
  if (!filled.length) return "";
  const colorMap: Record<string,string> = { "#6d28d9":"#6d28d9", "#0891b2":"#0891b2", "#059669":"#059669" };
  const col = colorMap[team.color] || "#6b7280";
  return `
    <div class="section">
      <div class="section-title">${team.emoji} ${team.name}</div>
      ${filled.map((iss, i) => `
        <div class="issue">
          <div class="issue-top">
            <div class="issue-num" style="background:${col};">${i+1}</div>
            <div class="issue-problem">${iss.problem.replace(/\n/g,"<br/>")}</div>
          </div>
          ${iss.solution ? `
            <div class="issue-bottom">
              <div class="sol-label">الحل:</div>
              <div class="sol-text">${iss.solution.replace(/\n/g,"<br/>")}</div>
            </div>
          ` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

  function printFullPDF() {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    const dateLabel = dateFrom && dateTo ? `${dateFrom} حتى ${dateTo}` : "";
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>تقرير أسبوعي</title>
    <style>${buildPDFStyles()}</style></head><body><div class="page">
<div class="header">
      <div class="header-top">
        <div class="badge">Rapport Hebdomadaire</div>
        <div class="header-right">
          ${dateLabel ? `<div class="dates">${dateLabel}</div>` : ""}
          ${reportDay ? `<div class="day">يوم ${reportDay}</div>` : ""}
        </div>
      </div>
      <h1>تقرير أسبوعي</h1>
      ${dateLabel ? `<div class="header-sub">${dateLabel}</div>` : ""}
      <div class="header-line"></div>
    </div>
    </div>
    ${buildStatsHTML()}
    ${teams.map(t => buildTeamHTML(t)).join("")}
    ${notes ? `
      <div class="section">
        <div class="section-header"><div class="icon" style="background:#f9fafb;">📝</div><h2>ملاحظات إضافية</h2></div>
        <div class="notes-box"><div class="notes-text">${notes.replace(/\n/g,"<br/>")}</div></div>
      </div>
    ` : ""}
    <div class="signatures">
      <div class="sig"><div class="sig-space"/><div class="sig-line">امضاء المدير</div></div>
      <div class="sig"><div class="sig-space"/><div class="sig-line">امضاء الشركة</div></div>
    </div>
    </div></body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  function printTeamPDF(ti: number) {
    const team = teams[ti];
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    const dateLabel = dateFrom && dateTo ? `${dateFrom} حتى ${dateTo}` : "";
    const colorMap: Record<string,string> = { "#6d28d9":"#f5f3ff", "#0891b2":"#ecfeff", "#059669":"#f0fdf4" };
    const bg = colorMap[team.color] || "#f9fafb";
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>${team.name}</title>
    <style>${buildPDFStyles()}</style></head><body><div class="page">
    <div class="header">
      <div class="header-left">
        <div class="badge" style="background:${team.color};">${team.emoji} ${team.name}</div>
        <h1>تقرير أسبوعي</h1>
        ${dateLabel ? `<div class="subtitle">${dateLabel}</div>` : ""}
      </div>
      <div class="header-right">
        ${dateLabel ? `<div class="dates">${dateLabel}</div>` : ""}
        ${reportDay ? `<div class="day">يوم ${reportDay}</div>` : ""}
      </div>
    </div>
    <div class="section">
      <div class="section-header">
        <div class="icon" style="background:${bg};">${team.emoji}</div>
        <h2>${team.name}</h2>
      </div>
      ${team.issues.filter(iss=>iss.problem).map((iss,i)=>`
        <div class="issue">
          <div class="issue-header">
            <div class="issue-num" style="background:${team.color};">${i+1}</div>
            <div class="issue-problem">${iss.problem.replace(/\n/g,"<br/>")}</div>
          </div>
          ${iss.solution?`<div class="issue-solution"><div class="solution-label">الحل:</div><div class="solution-text">${iss.solution.replace(/\n/g,"<br/>")}</div></div>`:""}
        </div>
      `).join("")}
    </div>
    <div class="signatures">
      <div class="sig"><div class="sig-space"/><div class="sig-line">امضاء المدير</div></div>
      <div class="sig"><div class="sig-space"/><div class="sig-line">امضاء الشركة</div></div>
    </div>
    </div></body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  const statIcons = ["📬","📦","↩️","👥","🚚","✅","💰","📊","🇩🇿"];
  const statColors = [
    "from-violet-50 to-white border-violet-100",
    "from-blue-50 to-white border-blue-100",
    "from-orange-50 to-white border-orange-100",
    "from-emerald-50 to-white border-emerald-100",
    "from-sky-50 to-white border-sky-100",
    "from-teal-50 to-white border-teal-100",
    "from-purple-50 to-white border-purple-200",
    "from-indigo-50 to-white border-indigo-200",
    "from-amber-50 to-white border-amber-200",
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* TOPBAR */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-200">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-none">تقرير أسبوعي</h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Rapport Hebdomadaire</p>
            </div>
          </div>
          <Link href="/dashboard/rapports/notes"
  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all">
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
  ملاحظة
</Link>
          <button onClick={printFullPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-200/60 active:scale-95">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            تصدير PDF كامل
          </button>
        </div>
      </div>

      <div className="px-6 py-8 space-y-6">

        {/* DATE CARD */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-3 flex items-center gap-2">
            <span className="text-white text-sm">📅</span>
            <span className="text-white text-xs font-bold tracking-wider uppercase">الفترة الزمنية</span>
          </div>
          <div className="p-5 grid grid-cols-4 gap-4">
            {[
              { label: "من", type: "date", val: dateFrom, set: setDateFrom },
              { label: "إلى", type: "date", val: dateTo, set: setDateTo },
              { label: "اليوم", type: "text", val: reportDay, set: setReportDay, ph: "مثال: خميس" },
              { label: "سعر الدولار (DZD)", type: "number", val: dollarRate, set: setDollarRate, ph: "مثال: 218" },
            ].map((f, i) => (
              <div key={i}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={(f as any).ph || ""}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all bg-gray-50 focus:bg-white"/>
              </div>
            ))}
<div className="col-span-4 flex justify-end mt-1">
              <button onClick={() => setFetchTrigger(p => p + 1)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-200/60 active:scale-95">
                Valider
              </button>
            </div>
          </div>
        </div>

        {/* STATS CARD */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-3 flex items-center gap-2">
            <span className="text-white text-sm">📊</span>
            <span className="text-white text-xs font-bold tracking-wider uppercase">إحصائيات عامة</span>
          </div>
          <div className="p-5 grid grid-cols-3 gap-3">
            {stats.map((stat, i) => (
              <div key={i} className={`relative bg-gradient-to-br ${statColors[i]} border rounded-xl p-3.5 group transition-all hover:shadow-md`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">{statIcons[i]}</span>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-none truncate">{stat.label}</p>
                  {stat.auto && <span className="mr-auto text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">AUTO</span>}
                </div>
                {stat.auto ? (
                  <p className={`text-xl font-black ${stat.value ? "text-gray-900" : "text-gray-200"}`}>
                    {stat.value || "—"}
                    {stat.value && <span className="text-xs font-normal text-gray-400 mr-1">
                      {stat.label.includes("DZD") ? "دج" : stat.label.includes("Cost") || stat.label.includes("Spend") ? "$" : ""}
                    </span>}
                  </p>
                ) : (
                  <input type="text" value={stat.value} onChange={e => updateStat(i, e.target.value)}
                    placeholder="أدخل القيمة"
                    className="w-full bg-transparent text-xl font-black text-gray-900 placeholder:text-gray-200 placeholder:text-sm placeholder:font-normal focus:outline-none"/>
                )}
              </div>
            ))}
          </div>

          {/* ALERTS */}
          <div className="px-5 pb-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">⚠️</span>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">تنبيهات وملاحظات عامة</p>
              </div>
              <textarea value={alertText} onChange={e => setAlertText(e.target.value)}
                placeholder="أدخل التنبيهات والملاحظات العامة هنا..."
                rows={3}
                className="w-full bg-transparent text-sm text-amber-900 placeholder:text-amber-300 focus:outline-none resize-none leading-relaxed"/>
            </div>
          </div>
        </div>

        {/* TEAM SECTIONS */}
        {teams.map((team, ti) => {
          const colorClasses: Record<string, {header: string, num: string, sol: string, solBorder: string, btn: string}> = {
            "#6d28d9": { header: "from-purple-600 to-purple-800", num: "bg-purple-600", sol: "bg-purple-50", solBorder: "border-purple-100", btn: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
            "#0891b2": { header: "from-cyan-600 to-cyan-800",    num: "bg-cyan-600",   sol: "bg-cyan-50",   solBorder: "border-cyan-100",   btn: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100"    },
            "#059669": { header: "from-emerald-600 to-emerald-800", num: "bg-emerald-600", sol: "bg-emerald-50", solBorder: "border-emerald-100", btn: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
          };
          const c = colorClasses[team.color];
          return (
            <div key={ti} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`bg-gradient-to-r ${c.header} px-5 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">{team.emoji}</span>
                  <span className="text-white text-xs font-bold tracking-wider uppercase">{team.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => printTeamPDF(ti)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded-lg transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    PDF القسم
                  </button>
                  <button onClick={() => addIssue(ti)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded-lg transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    نقطة جديدة
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {team.issues.map((iss, ii) => (
                  <div key={ii} className="border border-gray-100 rounded-xl overflow-hidden group hover:border-gray-200 transition-all hover:shadow-sm">
                    <div className="flex items-start gap-3 p-3 bg-gray-50">
                      <span className={`mt-0.5 w-6 h-6 rounded-full ${c.num} text-white text-[11px] font-black flex items-center justify-center flex-shrink-0`}>{ii+1}</span>
                      <textarea value={iss.problem} onChange={e => updateIssue(ti, ii, "problem", e.target.value)}
                        placeholder="المشكلة أو الملاحظة..."
                        rows={2}
                        className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed font-medium"/>
                      {team.issues.length > 1 && (
                        <button onClick={() => removeIssue(ti, ii)}
                          className="mt-0.5 w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                    <div className={`${c.sol} border-t ${c.solBorder} p-3 flex items-start gap-2`}>
                      <span className="text-[10px] font-black text-emerald-600 mt-1.5 whitespace-nowrap uppercase tracking-wide">الحل:</span>
                      <textarea value={iss.solution} onChange={e => updateIssue(ti, ii, "solution", e.target.value)}
                        placeholder="الحل المقترح..."
                        rows={2}
                        className="flex-1 bg-transparent text-sm text-emerald-800 placeholder:text-emerald-300 focus:outline-none resize-none leading-relaxed"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* NOTES */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-5 py-3 flex items-center gap-2">
            <span className="text-white text-sm">📝</span>
            <span className="text-white text-xs font-bold tracking-wider uppercase">ملاحظات إضافية</span>
          </div>
          <div className="p-5">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات أو تعليمات إضافية..."
              rows={4}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 resize-none transition-all"/>
          </div>
        </div>

        {/* SIGNATURES */}
        <div className="grid grid-cols-2 gap-6 pb-8">
          {["امضاء المدير", "امضاء الشركة"].map(sig => (
            <div key={sig} className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-end min-h-[100px]">
              <div className="border-t border-gray-300 pt-3 w-full text-center">
                <p className="text-xs font-semibold text-gray-400">{sig}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
