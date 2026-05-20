"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_WORKERS = ["Agent 1", "Agent 2", "Agent 3", "Agent 4"];
const STORAGE_KEY = "tv30_v4";
const MAX_ROWS = 30;

interface Row {
  date: string;
  cmd: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  loaded: boolean;
  fc: number;
  note: string;
}

interface AppState {
  workerNames: string[];
  rows: Row[];
}

function today() { return new Date().toISOString().split("T")[0]; }

function makeRow(): Row {
  return { date: today(), cmd: 0, s1: 0, s2: 0, s3: 0, s4: 0, loaded: false, fc: 0, note: "" };
}

function initRows(rows: Row[]): Row[] {
  const r = [...rows];
  while (r.length < MAX_ROWS) r.push(makeRow());
  return r;
}

function dhd(r: Row) { return Math.max(0, r.cmd - r.s1 - r.s2 - r.s3 - r.s4); }

function pct(v: number, t: number) {
  if (!t || !v) return "—";
  return (v / t * 100).toFixed(1) + "%";
}

function analyzeHTML(html: string, targetDate: string) {
  const gs: Set<string>[] = [new Set(), new Set(), new Set(), new Set()];
  for (const block of html.split(/(?=<div class="maj"[^>]*data-id=")/)) {
    const im = block.match(/data-id="([^"]+)"/);
    if (!im) continue;
    const os = new Set<number>();
    for (const sm of block.matchAll(/<small>([\s\S]*?)<\/small>/g)) {
      const tx = sm[1].replace(/<[^>]*>/g, " ");
      const dm = tx.match(/Le\s*:\s*(\d{4}-\d{2}-\d{2})/);
      if (!dm || dm[1] !== targetDate) continue;
      for (let i = 1; i <= 4; i++)
        if (new RegExp(`\\bSuivi ${i}\\b`).test(tx)) os.add(i);
    }
    for (let i = 0; i < 4; i++) if (os.has(i + 1)) gs[i].add(im[1]);
  }
  return { s1: gs[0].size, s2: gs[1].size, s3: gs[2].size, s4: gs[3].size };
}

const A = [
  { wrap: "bg-purple-50 border-purple-200", tag: "bg-purple-200 text-purple-900", input: "text-purple-800", val: "text-purple-800", pct: "text-purple-500", kpi: "bg-purple-50", pdf: "#3C3489" },
  { wrap: "bg-teal-50 border-teal-200",     tag: "bg-teal-200 text-teal-900",     input: "text-teal-800",   val: "text-teal-800",   pct: "text-teal-500",   kpi: "bg-teal-50",   pdf: "#085041" },
  { wrap: "bg-amber-50 border-amber-200",   tag: "bg-amber-200 text-amber-900",   input: "text-amber-800",  val: "text-amber-800",  pct: "text-amber-500",  kpi: "bg-amber-50",  pdf: "#633806" },
  { wrap: "bg-red-50 border-red-200",       tag: "bg-red-200 text-red-900",       input: "text-red-800",    val: "text-red-800",    pct: "text-red-500",    kpi: "bg-red-50",    pdf: "#712B13" },
];

export default function TeamVerificationPage() {
  const [state, setState] = useState<AppState>({ workerNames: [...DEFAULT_WORKERS], rows: [] });
  const [saved, setSaved] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        parsed.rows = initRows(parsed.rows);
        setState(parsed);
        return;
      }
    } catch {}
    setState({ workerNames: [...DEFAULT_WORKERS], rows: initRows([]) });
  }, []);

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function clearAll() {
    if (!confirm("Effacer toutes les données ?")) return;
    const fresh: AppState = { workerNames: [...DEFAULT_WORKERS], rows: initRows([]) };
    setState(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }

  function updateWorker(i: number, val: string) {
    setState(prev => {
      const workerNames = [...prev.workerNames];
      workerNames[i] = val;
      return { ...prev, workerNames };
    });
  }

  function updateRow(i: number, field: keyof Row, val: any) {
    setState(prev => {
      const rows = [...prev.rows];
      rows[i] = { ...rows[i], [field]: val };
      return { ...prev, rows };
    });
  }

  const handleFiles = useCallback(async (ri: number, files: FileList | null) => {
    if (!files?.length) return;
    const arr = Array.from(files).filter(f =>
      f.name.endsWith(".html") || f.name.endsWith(".htm") || f.name.endsWith(".mhtml")
    );
    if (!arr.length) return;
    setState(prev => {
      const date = prev.rows[ri]?.date || today();
      (async () => {
        let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
        for (const f of arr) {
          const res = analyzeHTML(await f.text(), date);
          s1 += res.s1; s2 += res.s2; s3 += res.s3; s4 += res.s4;
        }
        setState(p => {
          const rows = [...p.rows];
          rows[ri] = { ...rows[ri], s1, s2, s3, s4, loaded: true, fc: arr.length };
          return { ...p, rows };
        });
      })();
      return prev;
    });
  }, []);

  function printPDF() {
    const wn = state.workerNames;
    const t = state.rows.reduce((a, r) => ({
      cmd: a.cmd + r.cmd, s1: a.s1 + r.s1, s2: a.s2 + r.s2,
      s3: a.s3 + r.s3, s4: a.s4 + r.s4, dhd: a.dhd + dhd(r),
    }), { cmd: 0, s1: 0, s2: 0, s3: 0, s4: 0, dhd: 0 });

    const activeRows = state.rows.filter(r => r.cmd > 0 || r.loaded);
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Team Verification</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;}
      body{padding:28px;color:#111;background:#fff;font-size:12px;}
      h1{font-size:18px;font-weight:600;margin-bottom:4px;}
      p.sub{font-size:11px;color:#888;margin-bottom:20px;}
      .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px;}
      .kpi{background:#f9fafb;border-radius:8px;padding:10px 12px;}
      .kpi .l{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;}
      .kpi .v{font-size:20px;font-weight:600;}
      .kpi .p{font-size:9px;color:#6b7280;margin-top:1px;}
      table{width:100%;border-collapse:collapse;}
      th{text-align:left;padding:7px 8px;font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #f3f4f6;background:#f9fafb;}
      th.r{text-align:right;}
      td{padding:6px 8px;font-size:11px;border-bottom:1px solid #f9fafb;}
      td.r{text-align:right;}
      tfoot td{background:#f9fafb;font-weight:600;border-top:1px solid #e5e7eb;}
      .muted{color:#9ca3af;font-size:10px;margin-left:3px;}
      .note-cell{color:#6b7280;font-style:italic;}
      @media print{body{padding:12px;}}
    </style></head><body>
    <h1>Team Verification</h1>
    <p class="sub">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
    <div class="kpis">
      <div class="kpi"><div class="l">Cmd Livre</div><div class="v">${t.cmd}</div></div>
      ${[t.s1, t.s2, t.s3, t.s4].map((v, i) => `
        <div class="kpi"><div class="l">${wn[i]}</div>
        <div class="v" style="color:${A[i].pdf}">${v}</div>
        <div class="p">${pct(v, t.cmd)}</div></div>`).join("")}
      <div class="kpi"><div class="l">DHD</div>
      <div class="v" style="color:#0C447C">${t.dhd}</div>
      <div class="p">${pct(t.dhd, t.cmd)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th style="width:20px">#</th>
        <th>Date</th>
        <th class="r">Cmd</th>
        ${wn.map(n => `<th class="r">${n}</th>`).join("")}
        <th class="r">DHD</th>
        <th class="r">% DHD</th>
        <th>Note</th>
      </tr></thead>
      <tbody>
        ${activeRows.map((r, i) => `<tr>
          <td style="color:#9ca3af;font-size:10px">${i + 1}</td>
          <td>${r.date}</td>
          <td class="r" style="font-weight:500">${r.cmd}</td>
          ${[r.s1, r.s2, r.s3, r.s4].map((v, si) => `
            <td class="r">
              <span style="color:${A[si].pdf};font-weight:500">${v}</span>
              <span class="muted">· ${pct(v, r.cmd)}</span>
            </td>`).join("")}
          <td class="r" style="color:#0C447C;font-weight:500">${dhd(r)}</td>
          <td class="r" style="color:#6b7280">${pct(dhd(r), r.cmd)}</td>
          <td class="note-cell">${r.note || ""}</td>
        </tr>`).join("")}
      </tbody>
      <tfoot><tr>
        <td colspan="2">Total — ${activeRows.length} lignes</td>
        <td class="r">${t.cmd}</td>
        ${[t.s1, t.s2, t.s3, t.s4].map((v, i) => `
          <td class="r">
            <span style="color:${A[i].pdf};font-weight:600">${v}</span>
            <span class="muted">· ${pct(v, t.cmd)}</span>
          </td>`).join("")}
        <td class="r" style="color:#0C447C;font-weight:600">${t.dhd}</td>
        <td class="r" style="color:#6b7280">${pct(t.dhd, t.cmd)}</td>
        <td></td>
      </tr></tfoot>
    </table>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  const totals = state.rows.reduce((a, r) => ({
    cmd: a.cmd + r.cmd, s1: a.s1 + r.s1, s2: a.s2 + r.s2,
    s3: a.s3 + r.s3, s4: a.s4 + r.s4, dhd: a.dhd + dhd(r),
  }), { cmd: 0, s1: 0, s2: 0, s3: 0, s4: 0, dhd: 0 });

  const sVals = [totals.s1, totals.s2, totals.s3, totals.s4];
  const loadedCount = state.rows.filter(r => r.loaded).length;

  return (
    <div className="min-h-screen bg-white px-6 py-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Team Verification</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            30 lignes · date &amp; upload indépendants · calcul en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Effacer
          </button>
          <button onClick={printPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            PDF
          </button>
          <button onClick={persist}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              saved
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={saved ? "M5 13l4 4L19 7" : "M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z"}/>
            </svg>
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* ── Agent Names ── */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {state.workerNames.map((name, i) => (
          <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${A[i].wrap}`}>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${A[i].tag}`}>
              S{i + 1}
            </span>
            <input
              value={name}
              onChange={e => updateWorker(i, e.target.value)}
              placeholder={`Agent ${i + 1}`}
              className={`flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none ${A[i].input}`}
            />
          </div>
        ))}
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Cmd Livre</p>
          <p className="text-2xl font-semibold text-gray-900">{totals.cmd}</p>
        </div>
        {sVals.map((v, i) => (
          <div key={i} className={`${A[i].kpi} rounded-xl p-3`}>
            <p className={`text-[10px] uppercase tracking-widest mb-1.5 flex items-baseline gap-1.5 ${A[i].val}`}>
              {state.workerNames[i]}
              <span className={`font-semibold ${A[i].pct}`}>{pct(v, totals.cmd)}</span>
            </p>
            <p className={`text-2xl font-semibold ${A[i].val}`}>{v}</p>
          </div>
        ))}
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-[10px] text-blue-600 uppercase tracking-widest mb-1.5 flex items-baseline gap-1.5">
            DHD
            <span className="font-semibold text-blue-500">{pct(totals.dhd, totals.cmd)}</span>
          </p>
          <p className="text-2xl font-semibold text-blue-800">{totals.dhd}</p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest w-7">#</th>
              <th className="text-center px-2 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest w-28">Date</th>
              <th className="text-center px-2 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest w-16">Cmd</th>
              {state.workerNames.map((n, i) => (
                <th key={i} className={`text-center px-2 py-2.5 text-[10px] font-medium uppercase tracking-widest w-20 ${A[i].val}`}>
                  {n}
                </th>
              ))}
              <th className="text-center px-2 py-2.5 text-[10px] font-medium text-blue-600 uppercase tracking-widest w-14">DHD</th>
              <th className="text-center px-2 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest w-12">%</th>
              <th className="text-center px-2 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest w-20">Fichiers</th>
              <th className="text-left px-2 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest w-24">Note</th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((r, i) => {
              const d = dhd(r);
              return (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-medium text-gray-400">{i + 1}</span>
                  </td>
                  <td className="px-1.5 py-2">
                    <input
                      type="date"
                      value={r.date}
                      onChange={e => updateRow(i, "date", e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1 text-gray-700 focus:outline-none focus:border-purple-400"
                    />
                  </td>
                  <td className="px-1.5 py-2 text-center">
                    <input
                      type="number" min={0}
                      value={r.cmd || ""}
                      placeholder="0"
                      onChange={e => updateRow(i, "cmd", parseInt(e.target.value) || 0)}
                      className="w-14 text-center text-xs font-semibold border border-gray-200 rounded-lg px-1 py-1 text-gray-800 focus:outline-none focus:border-purple-400"
                    />
                  </td>
                  {[r.s1, r.s2, r.s3, r.s4].map((v, si) => (
                    <td key={si} className="px-2 py-2 text-center">
                      <span className={`text-xs font-semibold ${A[si].val}`}>{v}</span>
                      <span className={`text-[10px] ml-1 ${A[si].pct}`}>· {pct(v, r.cmd)}</span>
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center">
                    <span className="text-xs font-semibold text-blue-700">{d}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="text-[10px] text-blue-400">{pct(d, r.cmd)}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      ref={el => { fileRefs.current[i] = el; }}
                      type="file"
                      accept=".html,.htm,.mhtml"
                      multiple
                      className="hidden"
                      onChange={e => { handleFiles(i, e.target.files); e.target.value = ""; }}
                    />
                    <button
                      onClick={() => fileRefs.current[i]?.click()}
                      className={`flex items-center gap-1 mx-auto text-[10px] px-2 py-1 rounded-lg border transition-all ${
                        r.loaded
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-white border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50"
                      }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d={r.loaded ? "M5 13l4 4L19 7" : "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"}/>
                      </svg>
                      {r.loaded ? `${r.fc}f ✓` : "Upload"}
                    </button>
                  </td>
                  <td className="px-1.5 py-2">
                    <input
                      type="text"
                      value={r.note || ""}
                      onChange={e => updateRow(i, "note", e.target.value)}
                      placeholder="..."
                      className="w-20 text-xs border border-gray-100 rounded-lg px-1.5 py-1 text-gray-500 placeholder-gray-300 focus:outline-none focus:border-purple-300 bg-transparent hover:border-gray-200 transition-colors"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={2} className="px-3 py-2.5 text-[10px] font-semibold text-gray-500">
                Total — {loadedCount} ligne{loadedCount !== 1 ? "s" : ""} chargée{loadedCount !== 1 ? "s" : ""}
              </td>
              <td className="text-center px-2 py-2.5 text-sm font-semibold text-gray-800">{totals.cmd}</td>
              {[totals.s1, totals.s2, totals.s3, totals.s4].map((v, i) => (
                <td key={i} className="text-center px-2 py-2.5">
                  <span className={`text-xs font-semibold ${A[i].val}`}>{v}</span>
                  <span className={`text-[10px] ml-1 ${A[i].pct}`}>· {pct(v, totals.cmd)}</span>
                </td>
              ))}
              <td className="text-center px-2 py-2.5">
                <span className="text-xs font-semibold text-blue-700">{totals.dhd}</span>
              </td>
              <td className="text-center px-2 py-2.5">
                <span className="text-[10px] text-blue-400">{pct(totals.dhd, totals.cmd)}</span>
              </td>
              <td /><td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
