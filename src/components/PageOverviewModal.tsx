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
  Copy,
  ExternalLink,
  Pin,
  Plus,
  Search,
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
      className="w-full h-28 rounded-md border border-white/10 block"
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
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-xl pro-popover-dark overflow-hidden text-[#f2f2f7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Native Header Bar */}
        <div className="px-4 py-3 border-b border-white/10 bg-[#18191d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onReplayIntro}
              title="OC20 Utility Tools"
              className="flex items-center justify-center px-2 py-1 rounded-md bg-white shrink-0"
            >
              <img
                src="./brand-logo.png"
                alt="OC20"
                className="h-4 w-auto object-contain block"
              />
            </button>

            <div>
              <h1 className="text-[13px] font-semibold tracking-tight text-white">
                OC2O Utility · Infinity Sheets
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-[#98a2b3]">
                <span>OC20 Utility Tools</span>
                <span className="opacity-40">·</span>
                <a
                  href="https://oc2o.co"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-mono text-[#cbd5e1] hover:text-white"
                >
                  <span>oc2o.co</span>
                  <ExternalLink size={9.5} />
                </a>
                <span className="opacity-40">·</span>
                <span>Local Storage</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-36 sm:w-44">
              <Search
                size={12.5}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8e8e93]"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter sheets..."
                aria-label="Search Sheets"
                className="w-full bg-[#111215] border border-white/10 rounded-md pl-7 pr-2.5 py-1 text-xs text-white placeholder:text-[#6e6e73] outline-none focus:border-[#007AFF]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onCreatePage();
                onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#007AFF] hover:bg-[#006be0] text-white text-xs font-medium transition"
            >
              <Plus size={13} />
              <span>New Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium transition"
            >
              <span>Canvas</span>
              <ArrowRight size={12} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#98a2b3] hover:text-white hover:bg-white/10 transition"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Sub-bar: Templates + Canvas Surface Selector */}
        <div className="px-4 py-2 border-b border-white/[0.07] bg-[#141519] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#8e8e93] font-medium mr-0.5">Templates:</span>
            <button
              type="button"
              onClick={() => {
                onInsertTemplate?.('flowchart-3');
                onClose();
              }}
              className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[#d1d5db] transition"
            >
              Flowchart
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertTemplate?.('math-pillar');
                onClose();
              }}
              className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[#d1d5db] transition"
            >
              Equation Ψᵢ(r)
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertTemplate?.('code-python');
                onClose();
              }}
              className="px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[#d1d5db] transition"
            >
              Python Card
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#8e8e93] font-medium mr-0.5">Surface:</span>
            {CORE_THEMES.map((t) => {
              const cfg = THEME_CONFIGS[t];
              const isCur = resolveThemeConfig(activePage.theme).id === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelectTheme?.(t)}
                  title={cfg.label}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] transition ${
                    isCur
                      ? 'bg-[#007AFF]/20 border-[#007AFF] text-white font-medium'
                      : 'bg-white/[0.03] border-white/[0.08] text-[#98a2b3] hover:text-white'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm border border-white/25"
                    style={{ backgroundColor: cfg.bg }}
                  />
                  <span className="hidden md:inline">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sheets Grid */}
        <div className="p-3.5 overflow-y-auto thin-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-[#121316]">
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
                className={`group relative rounded-lg p-2 border cursor-pointer transition ${
                  isActive
                    ? 'bg-[#1c1f26] border-[#007AFF]'
                    : 'bg-[#18191d] border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="relative">
                  <PagePreviewThumb page={pg} />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-[#cbd5e1]">
                    #{idx + 1}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {pg.pinned && <Pin size={10.5} className="text-amber-400 shrink-0" />}
                      <span className="text-xs font-medium text-white truncate">
                        {pg.title}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-[#8e8e93]">
                      {pg.elements.length} item{pg.elements.length === 1 ? '' : 's'} · {themeLabel}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onTogglePinPage(pg.id)}
                      title={pg.pinned ? 'Unpin' : 'Pin'}
                      className={`p-1 rounded hover:bg-white/10 ${
                        pg.pinned ? 'text-amber-400' : 'text-[#8e8e93] hover:text-white'
                      }`}
                    >
                      <Pin size={11.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicatePage(pg.id)}
                      title="Duplicate"
                      className="p-1 rounded text-[#8e8e93] hover:text-white hover:bg-white/10"
                    >
                      <Copy size={11.5} />
                    </button>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePage(pg.id)}
                        title="Delete"
                        className="p-1 rounded text-[#8e8e93] hover:text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 size={11.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* New Sheet Tile */}
          <button
            type="button"
            onClick={() => {
              onCreatePage();
              onClose();
            }}
            className="min-h-[158px] rounded-lg border border-dashed border-white/15 hover:border-[#007AFF] hover:bg-[#007AFF]/[0.06] flex flex-col items-center justify-center gap-1.5 text-[#8e8e93] hover:text-white transition"
          >
            <Plus size={18} />
            <span className="text-xs font-medium">New Sheet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
