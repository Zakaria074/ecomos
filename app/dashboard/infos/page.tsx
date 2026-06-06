'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const STORAGE_KEY = 'ecomos_infos_v6';

const EMOJIS = ['📁','🔑','📧','🌐','🚚','👤','💳','📱','🛍️','📊','🔐','🏦','📝','⚙️','🎯','💡','🤝','📦','🖥️','🔗','🧾','📌','🗓️','💬','🔔','🎨','🧠','🔍','📸','🗝️'];

const TYPES = [
  { val: 'text',     label: 'Text',     dot: '#a1a1aa', chip: 'bg-zinc-100 text-zinc-600',     ph: 'Enter value...' },
  { val: 'password', label: 'Password', dot: '#ec4899', chip: 'bg-pink-50 text-pink-700',      ph: '••••••••' },
  { val: 'email',    label: 'Email',    dot: '#6366f1', chip: 'bg-indigo-50 text-indigo-700',  ph: 'name@example.com' },
  { val: 'link',     label: 'Link',     dot: '#3b82f6', chip: 'bg-blue-50 text-blue-700',      ph: 'https://' },
  { val: 'phone',    label: 'Phone',    dot: '#22c55e', chip: 'bg-green-50 text-green-700',    ph: '+213 ...' },
  { val: 'number',   label: 'Number',   dot: '#f59e0b', chip: 'bg-amber-50 text-amber-700',    ph: '0' },
  { val: 'note',     label: 'Note',     dot: '#78716c', chip: 'bg-stone-100 text-stone-600',   ph: 'Write a note...' },
  { val: 'image',    label: 'Image',    dot: '#a855f7', chip: 'bg-purple-50 text-purple-700',  ph: '' },
] as const;

type FieldType = typeof TYPES[number]['val'];
interface Row { key: string; val: string; type: FieldType; images?: string[]; caption?: string }
interface Section { id: string; name: string; emoji: string; rows: Row[] }

const genId = () => Math.random().toString(36).slice(2, 9);
const getT  = (v: string) => TYPES.find(t => t.val === v) ?? TYPES[0];

const VAL_CLS: Record<string, string> = {
  text:     'text-gray-700',
  password: 'font-mono text-pink-600 tracking-widest',
  email:    'text-indigo-600',
  link:     'text-blue-600',
  phone:    'font-mono text-green-600',
  number:   'font-mono text-amber-600 font-semibold',
  note:     'text-gray-500',
};

// ── Portal ──────────────────────────────────────────────────────────────────
function PortalMenu({ anchor, onClose, children }: {
  anchor: HTMLElement | null; onClose: () => void; children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    const h = (e: MouseEvent) => { if (!anchor.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [anchor, onClose]);
  if (!anchor) return null;
  return createPortal(
    <div style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={e => e.stopPropagation()}>
      {children}
    </div>, document.body
  );
}

// ── Add Field Modal ──────────────────────────────────────────────────────────
function AddFieldModal({ onAdd, onClose }: {
  onAdd: (row: Row) => void; onClose: () => void;
}) {
  const [type, setType] = useState<FieldType>('text');
  const [key,  setKey]  = useState('');
  const [val,  setVal]  = useState('');
  const [show, setShow] = useState(false);
  const T = getT(type);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => { keyRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const submit = () => {
    if (!key.trim()) { keyRef.current?.focus(); return; }
    onAdd({ key: key.trim(), val: val.trim(), type });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-50">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">Add field</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Choose a type and fill in the details</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-sm transition-all">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Type selector */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map(t => (
                <button key={t.val} onClick={() => setType(t.val)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                    type === t.val
                      ? 'border-[#6d28d9] bg-[#faf5ff] text-[#6d28d9] shadow-sm'
                      : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-white'
                  }`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: t.dot }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field name */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Field name</label>
            <input
              ref={keyRef}
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="e.g. Email, Password, Link..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-800 outline-none focus:border-[#6d28d9] focus:bg-white placeholder:text-gray-300 transition-all font-medium"
            />
          </div>

          {/* Value */}
          {type !== 'image' && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Value</label>
              {type === 'note' ? (
                <textarea
                  value={val} onChange={e => setVal(e.target.value)} rows={3}
                  placeholder={T.ph}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-700 outline-none focus:border-[#6d28d9] focus:bg-white placeholder:text-gray-300 transition-all resize-none"
                />
              ) : (
                <div className="relative">
                  <input
                    type={type === 'password' && !show ? 'password' : 'text'}
                    value={val} onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                    placeholder={T.ph}
                    autoComplete="off"
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] outline-none focus:border-[#6d28d9] focus:bg-white placeholder:text-gray-300 transition-all pr-10 ${VAL_CLS[type] ?? 'text-gray-700'}`}
                  />
                  {type === 'password' && (
                    <button onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#6d28d9] text-sm transition-colors">
                      {show ? '🙈' : '👁️'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {type === 'image' && (
            <p className="text-[12px] text-gray-400 bg-purple-50 rounded-xl px-4 py-3 border border-purple-100">
              📸 Images can be added directly in the field after creation.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-100 text-[13px] font-semibold text-gray-400 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={submit}
            className="flex-1 py-2.5 rounded-xl bg-[#6d28d9] text-white text-[13px] font-bold hover:bg-[#5b21b6] transition-all shadow-lg shadow-violet-200 active:scale-95">
            Add field
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── CopyBtn ──────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-8 h-8 rounded-lg border transition-all ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-500'
          : 'border-gray-100 bg-white text-gray-300 hover:border-[#6d28d9] hover:text-[#6d28d9] hover:bg-[#faf5ff]'
      }`}
    >
      {copied
        ? <span className="text-[10px] font-bold mt-1.5">✓</span>
        : <>
            <span className="text-[13px] mt-1 leading-none">⧉</span>
            <span className="text-[8px] font-black tracking-wide leading-none mb-0.5">COPY</span>
          </>
      }
    </button>
  );
}

// ── TypeChip ──────────────────────────────────────────────────────────────────
function TypeChip({ type, onChange }: { type: FieldType; onChange: (t: FieldType) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const T = getT(type);
  return (
    <div className="flex-shrink-0">
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black tracking-wide border border-transparent hover:brightness-95 transition-all select-none ${T.chip}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.dot }} />
        {T.label}
        <span className="opacity-30 text-[8px]">▾</span>
      </button>
      {open && (
        <PortalMenu anchor={btnRef.current} onClose={() => setOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-black/10 p-1.5 w-40 flex flex-col gap-0.5">
            {TYPES.map(t => (
              <button key={t.val} onClick={() => { onChange(t.val); setOpen(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold w-full text-left transition-colors ${
                  t.val === type ? t.chip : 'text-gray-500 hover:bg-gray-50'
                }`}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.dot }} />
                {t.label}
                {t.val === type && <span className="ml-auto text-[9px] opacity-50">✓</span>}
              </button>
            ))}
          </div>
        </PortalMenu>
      )}
    </div>
  );
}

// ── EmojiBtn ──────────────────────────────────────────────────────────────────
function EmojiBtn({ emoji, onChange }: { emoji: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex-shrink-0">
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-lg hover:border-[#6d28d9] hover:scale-110 active:scale-95 transition-all shadow-sm">
        {emoji}
      </button>
      {open && (
        <PortalMenu anchor={btnRef.current} onClose={() => setOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-black/10 p-2 grid grid-cols-6 gap-1 w-52">
            {EMOJIS.map(em => (
              <button key={em} onClick={() => { onChange(em); setOpen(false); }}
                className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-violet-50 hover:scale-110 transition-all">
                {em}
              </button>
            ))}
          </div>
        </PortalMenu>
      )}
    </div>
  );
}

// ── ImageRow ──────────────────────────────────────────────────────────────────
function ImageRow({ row, onChange }: { row: Row; onChange: (r: Row) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgs = row.images ?? [];
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      const rd = new FileReader();
      rd.onload = ev => onChange({ ...row, images: [...(row.images ?? []), ev.target!.result as string] });
      rd.readAsDataURL(f);
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {imgs.map((src, i) => (
        <div key={i} className="relative group/img">
          <img src={src} alt="" className="w-14 h-14 rounded-xl object-cover border border-gray-100 shadow-sm" />
          <button onClick={() => onChange({ ...row, images: imgs.filter((_, ii) => ii !== i) })}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] hidden group-hover/img:flex items-center justify-center shadow">✕</button>
        </div>
      ))}
      <button onClick={() => fileRef.current?.click()}
        className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-0.5 hover:border-[#6d28d9] hover:bg-[#faf5ff] transition-all">
        <span className="text-gray-300 text-xl leading-none">+</span>
        <span className="text-[8px] font-black text-gray-300 tracking-widest">ADD</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input className="flex-1 min-w-20 text-[11px] text-gray-400 bg-transparent outline-none placeholder:text-gray-200 italic"
        placeholder="Caption..." value={row.caption ?? ''} onChange={e => onChange({ ...row, caption: e.target.value })} />
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────
function FieldRow({ row, onChange, onDelete }: {
  row: Row; onChange: (r: Row) => void; onDelete: () => void;
}) {
  const [show, setShow] = useState(false);
  const T = getT(row.type);

  return (
    <div className="group flex items-start gap-2.5 px-3 py-2 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-100 transition-all">
      {/* Type chip */}
      <TypeChip type={row.type} onChange={t => onChange({ ...row, type: t })} />

      {/* Key */}
      {row.type !== 'image' && (
        <>
          <span className="text-[11px] font-semibold text-gray-400 mt-1.5 flex-shrink-0 max-w-[90px] truncate">{row.key || <span className="italic text-gray-200">no name</span>}</span>
          <span className="text-gray-200 mt-1.5 flex-shrink-0 text-[11px]">—</span>
        </>
      )}

      {/* Value */}
      <div className="flex-1 flex items-start gap-1.5 min-w-0">
        {row.type === 'image' ? (
          <ImageRow row={row} onChange={onChange} />
        ) : row.type === 'note' ? (
          <textarea
            className="w-full bg-transparent outline-none text-[11px] text-gray-500 resize-none leading-relaxed placeholder:text-gray-200 mt-1"
            rows={2} placeholder={T.ph} value={row.val}
            onChange={e => onChange({ ...row, val: e.target.value })} />
        ) : (
          <>
            <input
              type={row.type === 'password' && !show ? 'password' : 'text'}
              className={`flex-1 min-w-0 bg-transparent outline-none text-[11px] placeholder:text-gray-200 mt-1.5 ${VAL_CLS[row.type] ?? 'text-gray-700'}`}
              placeholder={T.ph} value={row.val} autoComplete="off"
              onChange={e => onChange({ ...row, val: e.target.value })} />
            {row.type === 'password' && (
              <button onClick={() => setShow(s => !s)}
                className="flex-shrink-0 text-gray-300 hover:text-[#6d28d9] transition-colors text-sm mt-1">
                {show ? '🙈' : '👁️'}
              </button>
            )}
            {row.type === 'link' && row.val && (
              <a href={row.val} target="_blank" rel="noreferrer"
                className="flex-shrink-0 text-blue-400 hover:text-blue-600 text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">↗</a>
            )}
          </>
        )}
      </div>

      {/* Copy + Delete */}
      <CopyBtn text={row.val} />
      <button onClick={onDelete}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all w-6 h-6 rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 flex items-center justify-center text-xs mt-1">
        ✕
      </button>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ sec, si, total, onUpdate, onDelete, onMove }: {
  sec: Section; si: number; total: number;
  onUpdate: (s: Section) => void; onDelete: () => void; onMove: (d: -1|1) => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white hover:border-violet-100 focus-within:border-violet-200 transition-colors shadow-sm hover:shadow-md">
        {/* Head */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 rounded-t-2xl"
          style={{ background: 'linear-gradient(to right, #fafafa, #ffffff)' }}>
          <EmojiBtn emoji={sec.emoji} onChange={e => onUpdate({ ...sec, emoji: e })} />
          <input
            className="flex-1 text-[13px] font-black text-gray-800 bg-transparent outline-none placeholder:text-gray-200 focus:text-[#6d28d9] tracking-tight"
            value={sec.name} onChange={e => onUpdate({ ...sec, name: e.target.value })}
            placeholder="Section name..." />
          <div className="flex items-center gap-1">
            <button disabled={si === 0} onClick={() => onMove(-1)}
              className="w-7 h-7 rounded-lg text-gray-200 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 flex items-center justify-center text-sm transition-all">↑</button>
            <button disabled={si === total - 1} onClick={() => onMove(1)}
              className="w-7 h-7 rounded-lg text-gray-200 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 flex items-center justify-center text-sm transition-all">↓</button>
            <div className="w-px h-4 bg-gray-100 mx-0.5" />
            <button onClick={onDelete}
              className="w-7 h-7 rounded-lg text-gray-200 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all text-sm">🗑</button>
          </div>
        </div>

        {/* Fields */}
        <div className="px-3 py-2">
          {sec.rows.length === 0 && (
            <p className="text-center py-5 text-[11px] text-gray-200 italic">No fields yet</p>
          )}
          {sec.rows.map((row, ri) => (
            <FieldRow key={ri} row={row}
              onChange={r => onUpdate({ ...sec, rows: sec.rows.map((x, i) => i === ri ? r : x) })}
              onDelete={() => onUpdate({ ...sec, rows: sec.rows.filter((_, i) => i !== ri) })} />
          ))}
        </div>

        {/* Add field */}
        <button onClick={() => setShowModal(true)}
          className="w-full py-2.5 text-[11px] font-black text-gray-300 hover:text-[#6d28d9] hover:bg-[#faf5ff] border-t border-dashed border-gray-100 rounded-b-2xl transition-all flex items-center justify-center gap-1.5 tracking-widest uppercase">
          + Add field
        </button>
      </div>

      {showModal && (
        <AddFieldModal
          onAdd={row => onUpdate({ ...sec, rows: [...sec.rows, row] })}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InfosPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) setSections(JSON.parse(r)); } catch {}
  }, []);

  const saveAll = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sections)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [sections]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveAll]);

  const addSection = () => setSections(p => [...p, { id: genId(), name: '', emoji: '📁', rows: [] }]);
  const updateSec  = (i: number, s: Section) => setSections(p => p.map((x, si) => si === i ? s : x));
  const deleteSec  = (i: number) => { if (confirm('Delete this section?')) setSections(p => p.filter((_, si) => si !== i)); };
  const moveSec    = (i: number, d: -1|1) => setSections(p => {
    const a = [...p], ni = i + d;
    if (ni < 0 || ni >= a.length) return a;
    [a[i], a[ni]] = [a[ni], a[i]]; return a;
  });

  return (
    <div className="min-h-screen bg-white relative">
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '22px 22px', opacity: .45 }} />
      <div className="fixed top-0 right-0 w-96 h-96 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, #ede9fe44, transparent 70%)' }} />

      <div className="relative max-w-2xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 bg-[#6d28d9] rounded-2xl rotate-6 opacity-20" />
              <div className="relative w-11 h-11 bg-[#18181b] rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl">👤</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter leading-none">Infos</h1>
              <p className="text-[10px] text-gray-400 mt-1 font-bold tracking-widest uppercase">Personal Knowledge Base</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Saved
              </span>
            )}
            <button onClick={addSection}
              className="text-[12px] font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:border-[#6d28d9] hover:text-[#6d28d9] hover:bg-[#faf5ff] transition-all">
              + New section
            </button>
            <button onClick={saveAll}
              className="text-[12px] font-black px-4 py-2 rounded-xl bg-[#6d28d9] text-white hover:bg-[#5b21b6] transition-all shadow-lg shadow-violet-200 active:scale-95 tracking-wide">
              Save ⌘S
            </button>
          </div>
        </div>

        {/* Stats */}
        {sections.length > 0 && (
          <div className="flex items-center gap-3 mb-6 px-1">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              {sections.length} section{sections.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-200 text-xs">·</span>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              {sections.reduce((a, s) => a + s.rows.length, 0)} fields
            </span>
          </div>
        )}

        {/* Empty */}
        {sections.length === 0 && (
          <div className="text-center py-32">
            <div className="text-6xl mb-5 opacity-50">📚</div>
            <p className="text-sm font-black text-gray-300">Nothing here yet</p>
            <p className="text-xs text-gray-200 mt-1">Click "New section" to start</p>
          </div>
        )}

        {/* Sections */}
        <div className="flex flex-col gap-4">
          {sections.map((sec, i) => (
            <SectionCard key={sec.id} sec={sec} si={i} total={sections.length}
              onUpdate={s => updateSec(i, s)}
              onDelete={() => deleteSec(i)}
              onMove={d => moveSec(i, d)} />
          ))}
        </div>

        {sections.length > 0 && (
          <p className="text-center text-[10px] text-gray-200 mt-8 tracking-widest uppercase font-bold">
            Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-[9px] font-mono normal-case">⌘S</kbd> to save
          </p>
        )}
      </div>
    </div>
  );
}
