import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardPage,
  CORE_THEMES,
  THEME_CONFIGS,
  ThemeType,
  resolveThemeConfig,
} from '../types/board';
import { drawCanvasBackground, drawElement, getSelectionBounds } from '../utils/renderer';
import {
  ArrowRight,
  Code2,
  Copy,
  ExternalLink,
  FunctionSquare,
  GitBranch,
  Pin,
  Plus,
  Search,
  Snowflake,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface PagePreviewThumbProps {
  page: BoardPage;
}

const PagePreviewThumb: React.FC<PagePreviewThumbProps> = ({ page }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 240;
    const H = 132;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawCanvasBackground(ctx, W, H, page.theme);

    if (page.elements.length === 0) return;

    const bounds = getSelectionBounds(page.elements);
    if (!bounds) return;

    const pad = 28;
    const bw = Math.max(40, bounds.width + pad * 2);
    const bh = Math.max(30, bounds.height + pad * 2);
    const scale = Math.min(W / bw, H / bh, 1.2);
    const ox = (W - bw * scale) / 2;
    const oy = (H - bh * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.translate(-(bounds.x - pad), -(bounds.y - pad));
    for (const el of page.elements) {
      drawElement(ctx, el);
    }
    ctx.restore();
  }, [page]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-28 rounded-xl border border-white/10 block shadow-inner"
    />
  );
};

interface PageOverviewModalProps {
  isOpen: boolean;
  pages: BoardPage[];
  activePageId: string;
  onClose: () => void;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDuplicatePage: (id: string) => void;
  onTogglePinPage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onSelectTheme?: (theme: ThemeType) => void;
  onInsertTemplate?: (kind: 'math-pillar' | 'flowchart-3' | 'code-python') => void;
  onReplayIntro?: () => void;
}

export const PageOverviewModal: React.FC<PageOverviewModalProps> = ({
  isOpen,
  pages,
  activePageId,
  onClose,
  onSelectPage,
  onCreatePage,
  onDuplicatePage,
  onTogglePinPage,
  onDeletePage,
  onSelectTheme,
  onInsertTemplate,
  onReplayIntro,
}) => {
  const [query, setQuery] = useState('');

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) || pages[0],
    [pages, activePageId]
  );

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...pages].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    if (!q) return sorted;
    return sorted.filter((p) => p.title.toLowerCase().includes(q));
  }, [pages, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050a14]/85 backdrop-blur-xl flex items-center justify-center p-2.5 sm:p-4"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl lavish-popover-dark overflow-hidden text-[#f5f5f7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. OC20 UTILITY — INFINITY SHEETS HERO LANDING BANNER */}
        <div className="relative px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#081224] via-[#0d223d] to-[#111c33]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand Logo + OC20 Utility Attribution */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onReplayIntro}
                title="Replay OC20 Brand Intro Animation"
                className="flex items-center justify-center px-3 py-1.5 rounded-2xl bg-white shadow-[0_6px_22px_rgba(14,165,233,0.35)] ring-1 ring-white/80 hover:scale-105 transition"
              >
                <img
                  src="/brand-logo.png"
                  alt="OC20"
                  className="h-6 sm:h-7 w-auto object-contain block"
                />
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                    OC2O UTILITY — INFINITY SHEETS
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-400/15 border border-sky-300/30 text-sky-200 text-[10px] font-semibold">
                    <Snowflake size={10} />
                    <span>Winter Edition</span>
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-sky-200/80">
                  <span>From</span>
                  <span className="font-semibold text-white">OC20 UTILITY TOOLS</span>
                  <span className="opacity-40">·</span>
                  <a
                    href="https://oc2o.co"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4"
                  >
                    <span>OC2O.CO</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Controls: Search + New Sheet + Open Active Canvas */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-36 sm:w-48">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sheets..."
                  aria-label="Search Sheets"
                  className="w-full bg-black/35 border border-white/15 rounded-full pl-7 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onCreatePage();
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full lavish-active-tool text-white text-xs font-semibold transition hover:opacity-95"
              >
                <Plus size={13.5} />
                <span>New Sheet</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                title="Resume Active Sheet (Esc)"
              >
                <span>Open Canvas</span>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
                title="Close Landing Hub (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick-Start Utility Strip: Quick Templates + Subtle Winter & Studio Atmospheres */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold mr-1">
                Quick Launch:
              </span>
              <button
                type="button"
                onClick={() => {
                  onInsertTemplate?.('flowchart-3');
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-200 transition"
              >
                <GitBranch size={11.5} className="text-sky-300" />
                <span>3-Step Visio Flow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onInsertTemplate?.('math-pillar');
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-200 transition"
              >
                <FunctionSquare size={11.5} className="text-teal-300" />
                <span>State Field Ψᵢ(r)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onInsertTemplate?.('code-python');
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-200 transition"
              >
                <Code2 size={11.5} className="text-indigo-300" />
                <span>Python LLM Card</span>
              </button>
              {onReplayIntro && (
                <button
                  type="button"
                  onClick={onReplayIntro}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-400/15 hover:bg-sky-400/25 border border-sky-300/30 text-sky-200 transition"
                >
                  <Sparkles size={11.5} />
                  <span>OC20 Intro</span>
                </button>
              )}
            </div>

            {/* Atmosphere Quick Switcher Pills (including Nordic Winter) */}
            <div className="flex items-center gap-1">
              {CORE_THEMES.map((t) => {
                const cfg = THEME_CONFIGS[t];
                const isCur = resolveThemeConfig(activePage.theme).id === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onSelectTheme?.(t)}
                    title={`${cfg.label} — ${cfg.subtitle}`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition ${
                      isCur
                        ? 'bg-sky-400/25 border-sky-300 text-white font-semibold'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40"
                      style={{ background: cfg.previewGradient }}
                    />
                    <span className="hidden md:inline">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. INFINITY SHEETS NAVIGATION GRID */}
        <div className="p-3.5 overflow-y-auto thin-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredPages.map((pg, idx) => {
            const isActive = pg.id === activePageId;
            const themeLabel = resolveThemeConfig(pg.theme).label;
            return (
              <div
                key={pg.id}
                onClick={() => {
                  onSelectPage(pg.id);
                  onClose();
                }}
                className={`group relative rounded-2xl p-2.5 border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-[#0A84FF]/20 to-[#5E5CE6]/20 border-[#38BDF8] ring-1 ring-[#38BDF8]/50 shadow-lg'
                    : 'bg-white/[0.04] border-white/10 hover:border-sky-400/50 hover:bg-white/[0.08]'
                }`}
              >
                <div className="relative">
                  <PagePreviewThumb page={pg} />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-sky-200">
                    Sheet #{idx + 1}
                  </span>
                  {isActive && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full lavish-active-tool text-[10px] font-semibold text-white">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-1 px-0.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {pg.pinned && <Pin size={11} className="text-amber-400 shrink-0" />}
                      <span className="text-xs font-semibold text-white truncate">
                        {pg.title}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-slate-400">
                      {pg.elements.length} item{pg.elements.length === 1 ? '' : 's'} · {themeLabel}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-0.5 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onTogglePinPage(pg.id)}
                      title={pg.pinned ? 'Unpin sheet' : 'Pin sheet'}
                      className={`p-1.5 rounded-lg hover:bg-white/10 ${
                        pg.pinned ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Pin size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicatePage(pg.id)}
                      title="Duplicate sheet"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <Copy size={12} />
                    </button>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePage(pg.id)}
                        title="Delete sheet"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create New Infinity Sheet Tile */}
          <button
            type="button"
            onClick={() => {
              onCreatePage();
              onClose();
            }}
            className="min-h-[168px] rounded-2xl border border-dashed border-sky-400/35 hover:border-sky-300 bg-sky-500/[0.04] hover:bg-sky-500/10 flex flex-col items-center justify-center gap-2 text-sky-200/80 hover:text-white transition"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-400/15 border border-sky-300/30 flex items-center justify-center">
              <Plus size={20} className="text-sky-300" />
            </div>
            <span className="text-xs font-semibold">Create New Infinity Sheet</span>
            <span className="text-[10px] text-slate-400">Infinite canvas with winter frost theme</span>
          </button>
        </div>
      </div>
    </div>
  );
};
