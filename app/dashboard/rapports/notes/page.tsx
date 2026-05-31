"use client";

import { useState, useRef, useEffect } from "react";

export default function NotesPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [textAlign, setTextAlign] = useState<"right"|"center"|"left">("right");
  const [saved, setSaved] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("rapports_note");
      if (s) { const d = JSON.parse(s); setTitle(d.title||""); setContent(d.content||""); setAuthor(d.author||""); setDate(d.date||new Date().toISOString().split("T")[0]); }
    } catch {}
  }, []);
  useEffect(() => {
  if (editorRef.current && content) {
    editorRef.current.innerHTML = content;
  }
}, []);

function save() {
  const html = editorRef.current?.innerHTML || "";
  localStorage.setItem("rapports_note", JSON.stringify({ title, content: html, author, date }));
  setSaved(true);
  setTimeout(() => setSaved(false), 2000);
}

  function printPDF() {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>${title || "ملاحظة"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Tajawal',sans-serif;background:#fff;color:#111827;direction:rtl;padding:0;}
  .page{max-width:840px;margin:0 auto;padding:60px 56px;min-height:100vh;position:relative;}
  .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:48px;padding-bottom:20px;border-bottom:2px solid #111827;}
  .logo{font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#6d28d9;}
  .meta{font-size:11px;color:#9ca3af;text-align:left;}
  .meta .date{font-weight:600;color:#374151;}
  h1{font-size:36px;font-weight:900;color:#111827;line-height:1.1;margin-bottom:8px;letter-spacing:-1.5px;}
  .author{font-size:13px;color:#6b7280;margin-bottom:40px;font-style:italic;}
  .divider{height:3px;background:linear-gradient(90deg,#6d28d9,#a78bfa,transparent);border-radius:2px;margin-bottom:40px;}
  .content{font-size:${fontSize}px;line-height:2;color:#1f2937;text-align:${textAlign};white-space:pre-wrap;font-weight:${isBold?"600":"400"};}
  .footer{position:fixed;bottom:32px;left:56px;right:56px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #e5e7eb;}
  .footer-text{font-size:10px;color:#d1d5db;letter-spacing:1px;}
  .page-num{font-size:10px;color:#d1d5db;}
  @media print{body{padding:0;}.footer{position:fixed;bottom:20px;}}
</style></head><body>
<div class="page">
  <div class="top-bar">
    <div class="logo">ملاحظات</div>
    <div class="meta"><div class="date">${date}</div>${author ? `<div>${author}</div>` : ""}</div>
  </div>
  ${title ? `<h1>${title}</h1>` : ""}
  ${author ? `<div class="author">بقلم: ${author}</div>` : ""}
  <div class="divider"></div>
  <div class="content">${editorRef.current?.innerHTML || ""}</div>
  <div class="footer">
    <span class="footer-text">EcomOS Internal Platform</span>
    <span class="page-num">${date}</span>
  </div>
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="min-h-screen bg-[#f8f7f4]" dir="rtl">
      {/* TOP BAR */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="عنوان الملاحظة..."
              className="flex-1 bg-transparent text-base font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"/>
          </div>

          {/* TOOLBAR */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5">
            <button onClick={() => setIsBold(!isBold)}
              className={`w-7 h-7 rounded-lg text-sm font-black flex items-center justify-center transition-all ${isBold ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}>
              B
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1"/>
{[
  { color: "#ef4444", label: "أ" },
  { color: "#111827", label: "أ" },
].map(c => (
  <button key={c.color}
    onMouseDown={e => { e.preventDefault(); document.execCommand("styleWithCSS", false, "true"); document.execCommand("foreColor", false, c.color); }}
    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all hover:scale-110"
    style={{ color: c.color, border: `2px solid ${c.color}20` }}>
    {c.label}
  </button>
))}
            <div className="w-px h-4 bg-gray-200 mx-1"/>
            {(["right","center","left"] as const).map(align => (
              <button key={align} onClick={() => setTextAlign(align)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${textAlign === align ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {align === "right" && <><path strokeLinecap="round" strokeWidth={2} d="M3 6h18M3 12h12M3 18h18"/></>}
                  {align === "center" && <><path strokeLinecap="round" strokeWidth={2} d="M3 6h18M6 12h12M3 18h18"/></>}
                  {align === "left" && <><path strokeLinecap="round" strokeWidth={2} d="M3 6h18M9 12h12M3 18h18"/></>}
                </svg>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 mx-1"/>
{[{ label: "A-", delta: -2 }, { label: "A+", delta: 2 }].map(btn => (
  <button key={btn.label}
    onMouseDown={e => {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const ancestor = range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer as Element
        : range.commonAncestorContainer.parentElement!;
      const current = parseFloat(window.getComputedStyle(ancestor).fontSize) || 14;
      const newSize = Math.min(72, Math.max(8, current + btn.delta));
      const span = document.createElement("span");
      span.style.fontSize = newSize + "px";
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    }}
    className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 flex items-center justify-center text-xs font-bold">
    {btn.label}
  </button>
))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${saved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
              {saved ? "✓ محفوظ" : "💾 حفظ"}
            </button>
            <button onClick={printPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              PDF / طباعة
            </button>
          </div>
        </div>

        {/* META BAR */}
        <div className="px-6 py-2 border-t border-gray-50 flex items-center gap-4 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-xs text-gray-600 bg-transparent focus:outline-none border-b border-dashed border-gray-300 pb-0.5"/>
          </div>
          <div className="w-px h-3 bg-gray-200"/>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">الكاتب</label>
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="الاسم..."
              className="text-xs text-gray-600 bg-transparent focus:outline-none border-b border-dashed border-gray-300 pb-0.5 w-28 placeholder:text-gray-300"/>
          </div>
          <div className="w-px h-3 bg-gray-200"/>
          <span className="text-[10px] text-gray-400 mr-auto">{wordCount} كلمة · {charCount} حرف</span>
        </div>
      </div>

      {/* EDITOR AREA */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[calc(100vh-180px)]">
          {/* PAGE DECORATION */}
          <div className="h-1 bg-gradient-to-r from-purple-600 via-purple-400 to-transparent"/>
          <div className="p-10">
<div
  ref={editorRef}
  contentEditable
  dir="rtl"
  suppressContentEditableWarning
  onInput={e => setContent((e.target as HTMLDivElement).innerHTML)}
  data-placeholder="ابدأ الكتابة هنا..."
  style={{
    fontSize: `${fontSize}px`,
    fontWeight: isBold ? 600 : 400,
    textAlign: textAlign,
    lineHeight: 2,
    direction: "rtl",
    minHeight: "calc(100vh - 280px)",
  }}
  className="w-full bg-transparent text-gray-800 focus:outline-none leading-loose empty:before:content-[attr(data-placeholder)] empty:before:text-gray-200"
  suppressContentEditableWarning={true}
/>
          </div>
        </div>

        {/* BOTTOM INFO */}
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-xs text-gray-400">يُحفظ تلقائياً في المتصفح · اضغط PDF للطباعة</p>
          <button onClick={() => { if(confirm("مسح المحتوى؟")) { setContent(""); setTitle(""); } }}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors">مسح الكل</button>
        </div>
      </div>
    </div>
  );
}
