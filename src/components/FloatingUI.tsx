import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code2,
  Diamond,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FileCode2,
  FileJson,
  Grid3X3,
  Hand,
  Highlighter,
  Image as ImageIcon,
  ImagePlus,
  Laptop,
  LayoutGrid,
  Lock,
  Map as MapIcon,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Palette,
  Pen,
  PictureInPicture2,
  Plus,
  Redo2,
  Search,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import {
  BoardPage,
  CORE_THEMES,
  ColorAssistMode,
  FILL_PALETTE,
  FillStyle,
  FontFamily,
  GridType,
  PaletteId,
  RenderMode,
  STROKE_PALETTE,
  StrokeStyle,
  StyleConfig,
  THEME_CONFIGS,
  ToolType,
  WheelMode,
  resolveThemeConfig,
} from '../types/board';
import { CORE_PALETTES, VARIABLE_PALETTES, resolvePalette } from '../utils/smartTheme';
import { Minimap } from './Minimap';

interface FloatingUIProps {
  pages: BoardPage[];
  activePage: BoardPage;
  activeTool: ToolType;
  isToolLocked: boolean;
  styleConfig: StyleConfig;
  wheelMode: WheelMode;
  colorAssistMode: ColorAssistMode;
  paletteId: PaletteId;
  colorSequence: number;
  canInstallApp: boolean;
  zenMode: boolean;
  isStyleOpen: boolean;
  isActionsOpen: boolean;
  isMinimapOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  viewportSize: { width: number; height: number };
  onSelectTool: (tool: ToolType) => void;
  onToggleToolLock: () => void;
  onStepHarmonicColor: (dir?: 1 | -1, targetIdx?: number) => void;
  onCycleAssistMode: () => void;
  onSelectPalette: (id: PaletteId) => void;
  onCycleTheme: () => void;
  onCycleGrid: () => void;
  onHarmonizePage: () => void;
  onUpdateStyle: (patch: Partial<StyleConfig>) => void;
  onUpdatePageMeta: (patch: Partial<Pick<BoardPage, 'title' | 'theme' | 'grid' | 'camera'>>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToContent: () => void;
  onToggleWheelMode: () => void;
  onToggleMinimap: () => void;
  onToggleStyle: () => void;
  onToggleActions: () => void;
  onToggleZenMode: () => void;
  onOpenOverview: () => void;
  onOpenCommandPalette: () => void;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDeletePage: (id: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportOfflineHTML: () => void;
  onBackupJSON: () => void;
  onRestoreJSON: (file: File) => void;
  onInstallApp: () => void;
  onClearPage: () => void;
  onDockBlueSpace: () => void;
}

const TOOL_GROUPS: Array<
  Array<{
    id: ToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }>
> = [
  [
    { id: 'select', label: 'Select & Edit', shortcut: 'V', icon: <MousePointer2 size={14} /> },
    { id: 'pan', label: 'Pan Board', shortcut: 'H', icon: <Hand size={14} /> },
  ],
  [
    { id: 'pen', label: 'Pen', shortcut: 'P', icon: <Pen size={14} /> },
    { id: 'highlighter', label: 'Highlighter', shortcut: 'M', icon: <Highlighter size={14} /> },
    { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: <Eraser size={14} /> },
  ],
  [
    { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: <Square size={14} /> },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <Circle size={14} /> },
    { id: 'diamond', label: 'Diamond', shortcut: 'D', icon: <Diamond size={14} /> },
    { id: 'arrow', label: 'Visio Arrow', shortcut: 'A', icon: <ArrowUpRight size={14} /> },
    { id: 'line', label: 'Visio Line', shortcut: 'L', icon: <Minus size={14} className="-rotate-45" /> },
  ],
  [
    { id: 'text', label: 'Text & Math', shortcut: 'T', icon: <Type size={14} /> },
    { id: 'code', label: 'Code Card', shortcut: 'C', icon: <Code2 size={14} /> },
    { id: 'image', label: 'Add Image', shortcut: 'I', icon: <ImagePlus size={14} /> },
    { id: 'sticky', label: 'Sticky Note', shortcut: 'N', icon: <StickyNote size={14} /> },
    { id: 'laser', label: 'Laser Pointer', shortcut: 'K', icon: <Sparkles size={14} /> },
  ],
];

export const FloatingUI: React.FC<FloatingUIProps> = ({
  pages,
  activePage,
  activeTool,
  isToolLocked,
  styleConfig,
  wheelMode,
  colorAssistMode,
  paletteId,
  colorSequence,
  canInstallApp,
  zenMode,
  isStyleOpen,
  isActionsOpen,
  isMinimapOpen,
  canUndo,
  canRedo,
  viewportSize,
  onSelectTool,
  onToggleToolLock,
  onStepHarmonicColor,
  onCycleAssistMode,
  onSelectPalette,
  onCycleTheme,
  onCycleGrid,
  onHarmonizePage,
  onUpdateStyle,
  onUpdatePageMeta,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToContent,
  onToggleWheelMode,
  onToggleMinimap,
  onToggleStyle,
  onToggleActions,
  onToggleZenMode,
  onOpenOverview,
  onOpenCommandPalette,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onPrevPage,
  onNextPage,
  onExportPNG,
  onExportSVG,
  onExportOfflineHTML,
  onBackupJSON,
  onRestoreJSON,
  onInstallApp,
  onClearPage,
  onDockBlueSpace,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageStripRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [studioTab, setStudioTab] = useState<'atmosphere' | 'palettes' | 'craft'>('atmosphere');
  const [isPipToolsOpen, setIsPipToolsOpen] = useState(false);

  const isPipCompact = viewportSize.width < 680 || viewportSize.height < 460;
  const activeIndex = pages.findIndex((p) => p.id === activePage.id);
  const activePalette = resolvePalette(paletteId);
  const themeCfg = resolveThemeConfig(activePage.theme);
  const activeHarmonicIdx =
    ((colorSequence % activePalette.nodeCycle.length) + activePalette.nodeCycle.length) %
    activePalette.nodeCycle.length;

  const allToolsFlat = TOOL_GROUPS.flat();
  const activeToolMeta = allToolsFlat.find((t) => t.id === activeTool) || allToolsFlat[0];
  const pipPrimaryTools = allToolsFlat.filter((t) =>
    ['select', 'pen', 'rectangle', 'arrow', 'text', 'code', 'sticky'].includes(t.id)
  );
  const pipMoreTools = allToolsFlat.filter(
    (t) => !['select', 'pen', 'rectangle', 'arrow', 'text', 'code', 'sticky'].includes(t.id)
  );

  useEffect(() => {
    const strip = pageStripRef.current;
    const tab = activeTabRef.current;
    if (strip && tab) {
      const targetLeft = tab.offsetLeft - strip.clientWidth / 2 + tab.clientWidth / 2;
      strip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [activePage.id, pages.length]);

  const appleCapsule = themeCfg.isDark
    ? 'lavish-glass-dark text-[#f5f5f7]'
    : 'lavish-glass-light text-[#1d1d1f]';

  const applePopover = themeCfg.isDark
    ? 'lavish-popover-dark text-[#f5f5f7]'
    : 'lavish-popover-light text-[#1d1d1f]';

  const appleBtn = themeCfg.isDark
    ? 'text-[#d1d5db] hover:text-white hover:bg-white/[0.10] active:scale-95'
    : 'text-[#3a3a3c] hover:text-[#111827] hover:bg-black/[0.06] active:scale-95';

  const stopEvents = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  if (zenMode) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-40 p-2.5 flex items-end justify-end"
        onPointerDown={stopEvents}
      >
        <button
          onClick={onToggleZenMode}
          title="Show Minimal UI (Z)"
          className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 ${appleCapsule}`}
        >
          <Eye size={13} />
          <span>Show UI</span>
        </button>
      </div>
    );
  }

  if (isPipCompact) {
    const activeHarmonicColor = activePalette.nodeCycle[activeHarmonicIdx] || '#0A84FF';

    return (
      <div className="pointer-events-none fixed inset-0 z-40">
        {/* PIP COMPACT TOP BAR: Single Ultra-Slim Full-Width Unified Bar (Zero Overlap) */}
        <div
          onPointerDown={stopEvents}
          onWheel={stopEvents}
          className={`pointer-events-auto fixed top-2 left-2 right-2 z-40 flex items-center justify-between gap-1 px-2 py-1 rounded-2xl transition-all ${appleCapsule}`}
        >
          {/* Left: OC20 Hub + Sheet Switcher */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={onOpenOverview}
              title="OC20 Utility — Infinity Sheets Hub (G)"
              aria-label="OC20 Landing Hub"
              className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white shadow-sm ring-1 ring-white/60 shrink-0 hover:scale-105 transition"
            >
              <img
                src="./brand-logo.png"
                alt="OC20"
                className="h-3 w-auto object-contain block"
              />
            </button>

            <div className="flex items-center gap-0.5 rounded-full bg-current/[0.06] px-1 py-0.5 shrink-0">
              <button
                onClick={onPrevPage}
                disabled={activeIndex <= 0}
                title="Previous Sheet"
                className={`p-0.5 rounded-full disabled:opacity-25 ${appleBtn}`}
              >
                <ChevronLeft size={11} />
              </button>
              <button
                onClick={onOpenOverview}
                title="Switch or Manage Sheets (G)"
                className="text-[10.5px] font-semibold px-1 max-w-[74px] truncate"
              >
                {activePage.title}
              </button>
              <button
                onClick={onNextPage}
                disabled={activeIndex >= pages.length - 1}
                title="Next Sheet"
                className={`p-0.5 rounded-full disabled:opacity-25 ${appleBtn}`}
              >
                <ChevronRight size={11} />
              </button>
              <button
                onClick={onCreatePage}
                title="New Infinity Sheet (Alt+N)"
                className="p-0.5 rounded-full text-[#38BDF8] hover:bg-[#0A84FF]/20 transition"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>

          {/* Right: Undo/Redo + Single Tab Color Orb + Atmosphere + Studio + More */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`p-1 rounded-full disabled:opacity-25 ${appleBtn}`}
            >
              <Undo2 size={12} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={`p-1 rounded-full disabled:opacity-25 ${appleBtn}`}
            >
              <Redo2 size={12} />
            </button>

            <button
              onClick={() => onStepHarmonicColor(1)}
              title="Next Harmonic Colour (Tab)"
              aria-label="Step Harmonic Color"
              className="p-1 rounded-full hover:bg-current/10 transition flex items-center justify-center"
            >
              <span
                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/80 shadow-sm block"
                style={{
                  backgroundColor: activeHarmonicColor,
                  boxShadow: `0 0 8px ${activeHarmonicColor}`,
                }}
              />
            </button>

            <button
              onClick={onCycleTheme}
              title={`Atmosphere: ${themeCfg.label} (click to switch)`}
              aria-label="Toggle Theme"
              className={`p-1 rounded-full transition ${appleBtn}`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/50 shadow-sm block"
                style={{ background: themeCfg.previewGradient }}
              />
            </button>

            <button
              onClick={() => {
                setIsPipToolsOpen(false);
                onToggleStyle();
              }}
              title="Atmosphere, Palettes & Craft Studio"
              aria-label="Style and Palettes"
              className={`p-1 rounded-full transition ${
                isStyleOpen ? 'lavish-active-tool text-white' : appleBtn
              }`}
            >
              <Palette size={12.5} />
            </button>

            <button
              onClick={() => {
                setIsPipToolsOpen(false);
                onToggleActions();
              }}
              title="Export, Share & Actions"
              aria-label="More Actions"
              className={`p-1 rounded-full transition ${
                isActionsOpen ? 'lavish-active-tool text-white' : appleBtn
              }`}
            >
              <MoreHorizontal size={12.5} />
            </button>
          </div>
        </div>

        {/* PIP Studio Popover */}
        {isStyleOpen && (
          <div
            onPointerDown={stopEvents}
            onWheel={stopEvents}
            className={`pointer-events-auto fixed right-2 top-12 w-[min(276px,calc(100vw-16px))] max-h-[calc(100vh-110px)] overflow-y-auto thin-scrollbar rounded-3xl p-2.5 z-50 space-y-2.5 text-xs ${applePopover}`}
          >
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-2xl ${
                themeCfg.isDark ? 'bg-black/35 border border-white/10' : 'bg-black/[0.06] border border-black/10'
              }`}
            >
              {(
                [
                  { id: 'atmosphere', label: 'Theme' },
                  { id: 'palettes', label: 'Colors' },
                  { id: 'craft', label: 'Craft' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudioTab(tab.id)}
                  className={`py-1 rounded-xl text-[10.5px] font-semibold transition-all ${
                    studioTab === tab.id
                      ? 'lavish-active-tool text-white shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {studioTab === 'atmosphere' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {CORE_THEMES.map((t) => {
                    const cfg = THEME_CONFIGS[t];
                    const isSelected = resolveThemeConfig(activePage.theme).id === t;
                    return (
                      <button
                        key={t}
                        onClick={() => onUpdatePageMeta({ theme: t })}
                        className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#5E5CE6]/25 border-[#38BDF8]'
                            : themeCfg.isDark
                              ? 'bg-white/[0.04] border-white/10'
                              : 'bg-black/[0.03] border-black/10'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-lg border border-white/40 shrink-0"
                          style={{ background: cfg.previewGradient }}
                        />
                        <span className="text-[10.5px] font-semibold truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['dots', 'grid', 'cross', 'none'] as GridType[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => onUpdatePageMeta({ grid: g })}
                      className={`py-1 rounded-xl border text-[10px] capitalize ${
                        activePage.grid === g
                          ? 'lavish-active-tool border-transparent text-white font-semibold'
                          : themeCfg.isDark
                            ? 'bg-white/5 border-white/10'
                            : 'bg-black/[0.04] border-black/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {studioTab === 'palettes' && (
              <div className="space-y-1.5">
                {CORE_PALETTES.map((pid) => {
                  const pal = VARIABLE_PALETTES[pid];
                  const selected = resolvePalette(paletteId).id === pid;
                  return (
                    <button
                      key={pid}
                      onClick={() => onSelectPalette(pid)}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl border text-left transition ${
                        selected
                          ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#5E5CE6]/25 border-[#38BDF8]'
                          : themeCfg.isDark
                            ? 'bg-white/[0.04] border-white/10'
                            : 'bg-black/[0.03] border-black/10'
                      }`}
                    >
                      <span className="text-[10.5px] font-semibold truncate">{pal.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {pal.nodeCycle.slice(0, 5).map((col) => (
                          <span
                            key={col}
                            className="w-2.5 h-2.5 rounded-full border border-white/30"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={onHarmonizePage}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl lavish-active-tool text-white font-semibold text-[10.5px]"
                >
                  <Wand2 size={12} />
                  <span>Harmonize Sheet</span>
                </button>
              </div>
            )}

            {studioTab === 'craft' && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {STROKE_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdateStyle({ strokeColor: c })}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full border ${
                        styleConfig.strokeColor === c ? 'ring-2 ring-[#38BDF8] scale-110' : 'border-white/25'
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['none', 'semi', 'hachure', 'solid'] as FillStyle[]).map((fs) => (
                    <button
                      key={fs}
                      onClick={() => onUpdateStyle({ fillStyle: fs })}
                      className={`py-1 rounded-xl border text-[10px] capitalize ${
                        styleConfig.fillStyle === fs
                          ? 'lavish-active-tool border-transparent text-white font-semibold'
                          : themeCfg.isDark
                            ? 'bg-white/5 border-white/10'
                            : 'bg-black/[0.04] border-black/10'
                      }`}
                    >
                      {fs === 'semi' ? 'Glass' : fs}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'sans', label: 'SF Pro' },
                      { id: 'rounded', label: 'Round' },
                      { id: 'serif', label: 'NY' },
                      { id: 'mono', label: 'Mono' },
                    ] as Array<{ id: FontFamily; label: string }>
                  ).map((ff) => (
                    <button
                      key={ff.id}
                      onClick={() => onUpdateStyle({ fontFamily: ff.id })}
                      className={`py-1 rounded-xl border text-[10px] ${
                        styleConfig.fontFamily === ff.id
                          ? 'lavish-active-tool border-transparent text-white font-semibold'
                          : themeCfg.isDark
                            ? 'bg-white/5 border-white/10'
                            : 'bg-black/[0.04] border-black/10'
                      }`}
                    >
                      {ff.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PIP Actions Popover */}
        {isActionsOpen && (
          <div
            onPointerDown={stopEvents}
            onWheel={stopEvents}
            className={`pointer-events-auto fixed right-2 top-12 w-52 max-h-[calc(100vh-110px)] overflow-y-auto thin-scrollbar rounded-2xl p-1.5 z-50 text-xs space-y-0.5 ${applePopover}`}
          >
            <button
              onClick={() => {
                onOpenCommandPalette();
                onToggleActions();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <Search size={13} className="text-sky-400" />
              <span>Spotlight Search (⌘K)</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                onToggleActions();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sky-300 hover:bg-[#0A84FF]/15 transition text-left font-semibold"
            >
              <Sparkles size={13} />
              <span>Copy Shareable Link</span>
            </button>
            <div className="h-px bg-current opacity-10 my-1" />
            <button
              onClick={onExportPNG}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <ImageIcon size={13} className="text-sky-400" />
              <span>Export PNG</span>
            </button>
            <button
              onClick={onExportSVG}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <Download size={13} className="text-indigo-400" />
              <span>Export SVG</span>
            </button>
            <button
              onClick={onBackupJSON}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <FileJson size={13} className="text-emerald-400" />
              <span>Backup JSON</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <Upload size={13} className="text-amber-400" />
              <span>Restore Backup</span>
            </button>
            <div className="h-px bg-current opacity-10 my-1" />
            <button
              onClick={onClearPage}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 transition text-left"
            >
              <Trash2 size={13} />
              <span>Clear Sheet</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onRestoreJSON(file);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* PIP Expanded Extra Tools Tray */}
        {isPipToolsOpen && (
          <div
            onPointerDown={stopEvents}
            onWheel={stopEvents}
            className={`pointer-events-auto fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl ${applePopover}`}
          >
            {pipMoreTools.map((t) => {
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setIsPipToolsOpen(false);
                  }}
                  title={`${t.label} (${t.shortcut})`}
                  aria-label={t.label}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                    active ? 'lavish-active-tool text-white' : appleBtn
                  }`}
                >
                  {t.icon}
                </button>
              );
            })}
            <div className="h-4 w-px bg-current opacity-15 mx-0.5" />
            <button
              onClick={onToggleToolLock}
              title={isToolLocked ? 'Unlock Tool (Q)' : 'Lock Tool (Q)'}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                isToolLocked ? 'bg-[#FF9F0A]/25 text-[#FF9F0A]' : appleBtn
              }`}
            >
              {isToolLocked ? <Lock size={12.5} /> : <Unlock size={12.5} />}
            </button>
          </div>
        )}

        {/* PIP COMPACT BOTTOM BAR: Single Unified Dock (7 Core Tools + More Tools + Zoom + Hide UI) */}
        <div
          onPointerDown={stopEvents}
          onWheel={stopEvents}
          className={`pointer-events-auto fixed bottom-2 left-2 right-2 z-40 flex items-center justify-between gap-1 px-2 py-1 rounded-2xl transition-all ${appleCapsule}`}
        >
          {/* Core 7 Tools + More Tools Popover Trigger */}
          <div className="flex items-center gap-0.5">
            {pipPrimaryTools.map((t) => {
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTool(t.id);
                    setIsPipToolsOpen(false);
                  }}
                  title={`${t.label} (${t.shortcut})`}
                  aria-label={t.label}
                  className={`relative w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                    active ? 'lavish-active-tool text-white scale-105' : appleBtn
                  }`}
                >
                  {t.icon}
                </button>
              );
            })}

            <button
              onClick={() => setIsPipToolsOpen((v) => !v)}
              title={
                pipMoreTools.some((t) => t.id === activeTool)
                  ? `Active: ${activeToolMeta.label} — click for more tools`
                  : 'More Tools (Pan, Highlighter, Eraser, Circle, Diamond, Line, Image, Laser)'
              }
              aria-label="More Tools"
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                isPipToolsOpen || pipMoreTools.some((t) => t.id === activeTool)
                  ? 'lavish-active-tool text-white'
                  : appleBtn
              }`}
            >
              {pipMoreTools.some((t) => t.id === activeTool) ? activeToolMeta.icon : <Plus size={13.5} />}
            </button>
          </div>

          {/* Right Micro-Controls: Zoom % (Reset/Fit) + Zen Mode */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onResetZoom}
              title="Reset Zoom to 100%"
              className={`px-1.5 py-0.5 rounded-lg font-mono text-[10px] font-semibold transition ${appleBtn}`}
            >
              {Math.round(activePage.camera.zoom * 100)}%
            </button>
            <button
              onClick={onFitToContent}
              title="Fit Content (Shift+1)"
              className="p-1 rounded-lg text-[#38BDF8] hover:bg-[#0A84FF]/15 transition"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={onToggleZenMode}
              title="Hide UI (Z)"
              className={`p-1 rounded-lg transition ${appleBtn}`}
            >
              <EyeOff size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* 1. TOP-LEFT CORNER: Brand Logo + Page Overview + Editable Title + Undo/Redo + Spotlight */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed top-2.5 left-2.5 z-40 flex items-center gap-1 px-2 py-1 rounded-full transition-all ${appleCapsule}`}
      >
        <button
          type="button"
          onClick={onOpenOverview}
          title="OC20 Utility — Infinity Sheets Landing Hub (G)"
          aria-label="OC20 Landing Hub"
          className="flex items-center justify-center px-2 py-0.5 rounded-full bg-white shadow-[0_2px_10px_rgba(10,132,255,0.28)] ring-1 ring-white/60 shrink-0 hover:scale-105 transition"
        >
          <img
            src="./brand-logo.png"
            alt="OC20"
            className="h-3.5 w-auto object-contain block"
          />
        </button>

        <button
          onClick={onOpenOverview}
          title="Infinity Sheets Hub & Overview (G)"
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#0A84FF]/20 to-[#5E5CE6]/20 hover:from-[#0A84FF]/30 hover:to-[#5E5CE6]/30 border border-[#0A84FF]/35 text-[#38BDF8] transition text-[11px] font-semibold shrink-0"
        >
          <LayoutGrid size={11.5} />
          <span>{pages.length}</span>
        </button>

        <input
          type="text"
          value={activePage.title}
          onChange={(e) => onUpdatePageMeta({ title: e.target.value })}
          aria-label="Page Title"
          className={`w-14 sm:w-20 bg-transparent text-xs font-semibold px-1.5 py-0.5 rounded-full outline-none border border-transparent focus:border-[#0A84FF]/50 transition truncate ${
            themeCfg.isDark ? 'text-[#f5f5f7] focus:bg-white/10' : 'text-[#1d1d1f] focus:bg-black/5'
          }`}
        />

        <div className="h-3.5 w-px bg-current opacity-15 mx-0.5 shrink-0" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1 rounded-full disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 ${appleBtn}`}
        >
          <Undo2 size={13.5} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1 rounded-full disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 ${appleBtn}`}
        >
          <Redo2 size={13.5} />
        </button>

        <button
          onClick={onOpenCommandPalette}
          title="Spotlight Search & Templates (Ctrl+K)"
          aria-label="Spotlight Command Palette"
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-medium transition-all duration-150 ${appleBtn}`}
        >
          <Search size={12} />
          <span className="hidden md:inline font-mono text-[9.5px] opacity-75">⌘K</span>
        </button>
      </div>

      {/* 2. BOTTOM-CENTER: Sculpted macOS / VisionOS Tool Dock (Zero Collision at Any Viewport) */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        style={{ maxWidth: 'calc(100vw - 16px)' }}
        className={`pointer-events-auto fixed z-40 left-1/2 -translate-x-1/2 bottom-12 xl:bottom-2.5 overflow-x-auto no-scrollbar flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-2xl transition-all ${appleCapsule}`}
      >
        {TOOL_GROUPS.map((group, gIdx) => (
          <React.Fragment key={gIdx}>
            {gIdx > 0 && (
              <div className="h-4 w-px bg-current opacity-15 mx-0.5 shrink-0" />
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              {group.map((t) => {
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTool(t.id)}
                    title={`${t.label} (${t.shortcut})`}
                    aria-label={t.label}
                    className={`relative shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all duration-150 ${
                      active
                        ? 'lavish-active-tool text-white scale-105'
                        : `${appleBtn} hover:-translate-y-0.5`
                    }`}
                  >
                    {t.icon}
                    {active && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]" />
                    )}
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        <div className="h-4 w-px bg-current opacity-15 mx-0.5 shrink-0" />

        {/* Tool Lock Toggle directly inside the Tool Dock for intuitive reach */}
        <button
          onClick={onToggleToolLock}
          title={
            isToolLocked
              ? 'Tool Locked (Q) — stays active after drawing'
              : 'Auto-Return to Select Cursor after drawing (press Q to lock tool)'
          }
          aria-label="Toggle Tool Lock"
          className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all duration-150 ${
            isToolLocked ? 'bg-[#FF9F0A]/25 text-[#FF9F0A] ring-1 ring-[#FF9F0A]/50' : appleBtn
          }`}
        >
          {isToolLocked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </div>

      {/* 3. TOP-RIGHT CORNER: Jewel Harmonic Swatches + Atmosphere Orb + Grid + Studio + Actions */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed top-2.5 right-2.5 z-40 flex items-center gap-1 px-2 py-1 rounded-full transition-all ${appleCapsule}`}
      >
        {/* Tab Prescribed Harmonic Jewel Swatches */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
            themeCfg.isDark ? 'bg-black/30 border-white/10' : 'bg-black/[0.04] border-black/10'
          }`}
          title="Prescribed Harmonic Colours — press Tab to step forward"
        >
          <button
            onClick={() => onStepHarmonicColor(1)}
            className="hidden sm:inline text-[10px] font-semibold tracking-tight opacity-80 hover:opacity-100 pr-0.5"
          >
            Tab⇥
          </button>
          {activePalette.nodeCycle.slice(0, 5).map((col, idx) => {
            const isSelected = idx === activeHarmonicIdx;
            return (
              <button
                key={col}
                onClick={() => onStepHarmonicColor(1, idx)}
                aria-label={`Harmonic color ${idx + 1}`}
                style={{
                  backgroundColor: col,
                  boxShadow: isSelected ? `0 0 10px ${col}` : undefined,
                }}
                className={`rounded-full transition-all duration-150 ${
                  isSelected
                    ? 'w-3 h-3 ring-2 ring-white scale-110'
                    : 'w-2 h-2 opacity-75 hover:opacity-100 hover:scale-110'
                }`}
              />
            );
          })}
        </div>

        {/* Live Atmosphere Theme Orb Button */}
        <button
          onClick={onCycleTheme}
          title={`Canvas Atmosphere: ${themeCfg.label} — ${themeCfg.subtitle} (click to switch)`}
          aria-label="Toggle Theme"
          className={`flex items-center gap-1.5 px-1.5 py-1 rounded-full transition-all duration-150 ${appleBtn}`}
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
            style={{ background: themeCfg.previewGradient }}
          />
          <span className="hidden xl:inline text-[10.5px] font-medium max-w-[92px] truncate">
            {themeCfg.label}
          </span>
        </button>

        <button
          onClick={onCycleGrid}
          title={`Grid: ${activePage.grid} (Dots / Lines / Cross / Off)`}
          aria-label="Toggle Grid"
          className={`p-1.5 rounded-full transition-all duration-150 ${
            activePage.grid !== 'none'
              ? 'text-[#38BDF8] bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25'
              : appleBtn
          }`}
        >
          <Grid3X3 size={13.5} />
        </button>

        <button
          onClick={onToggleStyle}
          title="Interactive Atmosphere, Harmonic Palettes & Craft Studio"
          aria-label="Style and Palettes"
          className={`p-1.5 rounded-full transition-all duration-150 ${
            isStyleOpen ? 'lavish-active-tool text-white' : appleBtn
          }`}
        >
          <Palette size={13.5} />
        </button>

        <button
          onClick={onDockBlueSpace}
          title="Pop Out to Blue Space Quadrant"
          className={`hidden sm:inline-flex p-1.5 rounded-full transition-all duration-150 ${appleBtn}`}
        >
          <PictureInPicture2 size={13.5} />
        </button>

        <button
          onClick={onToggleActions}
          title="Export & Board Actions"
          aria-label="More Actions"
          className={`p-1.5 rounded-full transition-all duration-150 ${
            isActionsOpen ? 'lavish-active-tool text-white' : appleBtn
          }`}
        >
          <MoreHorizontal size={13.5} />
        </button>

        {/* LAVISH 3-TAB INTERACTIVE STUDIO PANEL (No Ugly Scrollbars — Fits Cleanly on Every Screen) */}
        {isStyleOpen && (
          <div
            className={`absolute right-0 top-11 w-72 rounded-3xl p-3 z-50 space-y-2.5 text-xs transition-all ${applePopover}`}
          >
            {/* Segmented Apple Tab Control */}
            <div
              className={`grid grid-cols-3 gap-1 p-1 rounded-2xl ${
                themeCfg.isDark ? 'bg-black/35 border border-white/10' : 'bg-black/[0.06] border border-black/10'
              }`}
            >
              {(
                [
                  { id: 'atmosphere', label: 'Atmosphere' },
                  { id: 'palettes', label: 'Harmonic' },
                  { id: 'craft', label: 'Ink & Craft' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudioTab(tab.id)}
                  className={`py-1 rounded-xl text-[11px] font-semibold transition-all ${
                    studioTab === tab.id
                      ? 'lavish-active-tool text-white shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Curated Canvas Atmospheres + Grid Texture */}
            {studioTab === 'atmosphere' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 gap-1.5">
                  {CORE_THEMES.map((t) => {
                    const cfg = THEME_CONFIGS[t];
                    const isSelected = resolveThemeConfig(activePage.theme).id === t;
                    return (
                      <button
                        key={t}
                        onClick={() => onUpdatePageMeta({ theme: t })}
                        className={`flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#5E5CE6]/25 border-[#38BDF8] shadow-sm'
                            : themeCfg.isDark
                              ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                              : 'bg-black/[0.03] border-black/10 hover:bg-black/[0.06]'
                        }`}
                      >
                        <span
                          className="w-7 h-7 rounded-xl border border-white/40 shadow-inner shrink-0"
                          style={{ background: cfg.previewGradient }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold truncate">{cfg.label}</div>
                          <div className="text-[10px] opacity-65 truncate">{cfg.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold mb-1.5">
                    Grid Texture
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['dots', 'grid', 'cross', 'none'] as GridType[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => onUpdatePageMeta({ grid: g })}
                        className={`py-1 rounded-xl border text-[11px] capitalize transition ${
                          activePage.grid === g
                            ? 'lavish-active-tool border-transparent text-white font-semibold'
                            : themeCfg.isDark
                              ? 'bg-white/5 border-white/10 text-slate-300'
                              : 'bg-black/[0.04] border-black/10 text-slate-700'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Harmonic Jewel Palettes + Tab Stepping + Page Harmonizer */}
            {studioTab === 'palettes' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider opacity-65 font-semibold">
                    Prescribed Palettes
                  </span>
                  <button
                    onClick={onCycleAssistMode}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      themeCfg.isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/15'
                    }`}
                  >
                    Mode: {colorAssistMode}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {CORE_PALETTES.map((pid) => {
                    const pal = VARIABLE_PALETTES[pid];
                    const selected = resolvePalette(paletteId).id === pid;
                    return (
                      <button
                        key={pid}
                        onClick={() => onSelectPalette(pid)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl border text-left transition ${
                          selected
                            ? 'bg-gradient-to-r from-[#0A84FF]/25 to-[#5E5CE6]/25 border-[#38BDF8]'
                            : themeCfg.isDark
                              ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                              : 'bg-black/[0.03] border-black/10 hover:bg-black/[0.06]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold truncate">{pal.name}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {pal.nodeCycle.slice(0, 5).map((col) => (
                            <span
                              key={col}
                              className="w-2.5 h-2.5 rounded-full border border-white/30"
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={onHarmonizePage}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl lavish-active-tool text-white font-semibold text-[11px] transition hover:opacity-95"
                >
                  <Wand2 size={12.5} />
                  <span>Harmonize Entire Page</span>
                </button>
              </div>
            )}

            {/* TAB 3: Ink, Surface Finish, Stroke Feel & Apple Typography */}
            {studioTab === 'craft' && (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold mb-1.5">
                    Custom Ink & Glass Fill
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {STROKE_PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateStyle({ strokeColor: c })}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full border transition ${
                          styleConfig.strokeColor === c
                            ? 'ring-2 ring-[#38BDF8] scale-110 border-white'
                            : 'border-white/25 hover:scale-105'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={styleConfig.strokeColor}
                      onChange={(e) => onUpdateStyle({ strokeColor: e.target.value })}
                      title="Custom stroke color"
                      className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FILL_PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          onUpdateStyle({
                            fillColor: c,
                            fillStyle:
                              c !== 'transparent' && styleConfig.fillStyle === 'none'
                                ? 'semi'
                                : styleConfig.fillStyle,
                          })
                        }
                        style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}
                        className={`w-4 h-4 rounded-full border relative overflow-hidden ${
                          styleConfig.fillColor === c
                            ? 'ring-2 ring-[#38BDF8] scale-110 border-white'
                            : 'border-white/25'
                        }`}
                      >
                        {c === 'transparent' && (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] text-rose-400 font-bold">
                            /
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold mb-1">
                      Surface Finish
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(['none', 'semi', 'hachure', 'solid'] as FillStyle[]).map((fs) => (
                        <button
                          key={fs}
                          onClick={() => onUpdateStyle({ fillStyle: fs })}
                          className={`py-1 rounded-xl border text-[10.5px] capitalize ${
                            styleConfig.fillStyle === fs
                              ? 'lavish-active-tool border-transparent text-white font-semibold'
                              : themeCfg.isDark
                                ? 'bg-white/5 border-white/10'
                                : 'bg-black/[0.04] border-black/10'
                          }`}
                        >
                          {fs === 'semi' ? 'Glass' : fs}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold mb-1">
                      Stroke Feel
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(['clean', 'sketchy'] as RenderMode[]).map((rm) => (
                        <button
                          key={rm}
                          onClick={() => onUpdateStyle({ renderMode: rm })}
                          className={`py-1 rounded-xl border text-[10.5px] capitalize ${
                            styleConfig.renderMode === rm
                              ? 'lavish-active-tool border-transparent text-white font-semibold'
                              : themeCfg.isDark
                                ? 'bg-white/5 border-white/10'
                                : 'bg-black/[0.04] border-black/10'
                          }`}
                        >
                          {rm}
                        </button>
                      ))}
                      {(['solid', 'dashed'] as StrokeStyle[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => onUpdateStyle({ strokeStyle: st })}
                          className={`py-1 rounded-xl border text-[10.5px] capitalize ${
                            styleConfig.strokeStyle === st
                              ? 'lavish-active-tool border-transparent text-white font-semibold'
                              : themeCfg.isDark
                                ? 'bg-white/5 border-white/10'
                                : 'bg-black/[0.04] border-black/10'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold mb-1">
                    Apple Typography
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'sans', label: 'SF Pro' },
                        { id: 'rounded', label: 'Round' },
                        { id: 'serif', label: 'New York' },
                        { id: 'mono', label: 'SF Mono' },
                      ] as Array<{ id: FontFamily; label: string }>
                    ).map((ff) => (
                      <button
                        key={ff.id}
                        onClick={() => onUpdateStyle({ fontFamily: ff.id })}
                        className={`py-1 rounded-xl border text-[10px] ${
                          styleConfig.fontFamily === ff.id
                            ? 'lavish-active-tool border-transparent text-white font-semibold'
                            : themeCfg.isDark
                              ? 'bg-white/5 border-white/10'
                              : 'bg-black/[0.04] border-black/10'
                        }`}
                      >
                        {ff.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export / Actions Menu */}
        {isActionsOpen && (
          <div
            className={`absolute right-0 top-11 w-56 rounded-2xl p-1.5 z-50 text-xs space-y-0.5 ${applePopover}`}
          >
            <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-[10px] text-emerald-300 font-medium mb-1">
              Local-First Privacy: Sheets save locally on your device. Share via Link, JSON, or HTML.
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                onToggleActions();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sky-300 hover:bg-[#0A84FF]/15 transition text-left font-semibold"
            >
              <Sparkles size={13} />
              <span>Copy Shareable App Link</span>
            </button>
            <button
              onClick={onDockBlueSpace}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[#0A84FF] hover:bg-[#0A84FF]/10 transition text-left font-medium"
            >
              <PictureInPicture2 size={13} />
              <span>Dock to Blue Space</span>
            </button>
            <button
              onClick={onInstallApp}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[#0A84FF] hover:bg-[#0A84FF]/10 transition text-left font-medium"
            >
              <Laptop size={13} />
              <span>{canInstallApp ? 'Install Desktop App' : 'Desktop App Guide'}</span>
            </button>
            <div className="h-px bg-current opacity-10 my-1" />
            <button
              onClick={onExportPNG}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <ImageIcon size={13} className="text-sky-400" />
              <span>Export Page PNG</span>
            </button>
            <button
              onClick={onExportSVG}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <Download size={13} className="text-indigo-400" />
              <span>Export Page SVG</span>
            </button>
            <button
              onClick={onExportOfflineHTML}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <FileCode2 size={13} className="text-teal-400" />
              <span>Offline Snapshot (.html)</span>
            </button>
            <div className="h-px bg-current opacity-10 my-1" />
            <button
              onClick={onBackupJSON}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <FileJson size={13} className="text-emerald-400" />
              <span>Backup All Pages</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-current/10 transition text-left"
            >
              <Upload size={13} className="text-amber-400" />
              <span>Restore Backup</span>
            </button>
            <div className="h-px bg-current opacity-10 my-1" />
            <button
              onClick={onClearPage}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 transition text-left"
            >
              <Trash2 size={13} />
              <span>Clear Current Page</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onRestoreJSON(file);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      {/* 4. BOTTOM-LEFT CORNER: Minimap Radar + Zoom Controls */}
      <div className="fixed bottom-2.5 left-2.5 z-40 flex flex-col items-start gap-1.5">
        {isMinimapOpen && (
          <Minimap
            elements={activePage.elements}
            camera={activePage.camera}
            theme={activePage.theme}
            viewportSize={viewportSize}
            onNavigate={(cam) => onUpdatePageMeta({ camera: cam })}
          />
        )}

        <div
          onPointerDown={stopEvents}
          onWheel={stopEvents}
          className={`pointer-events-auto flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] ${appleCapsule}`}
        >
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className={`p-1 rounded-full transition-all duration-150 ${appleBtn}`}
          >
            <ZoomOut size={12.5} />
          </button>

          <button
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className={`px-1.5 py-0.5 rounded-full font-mono text-[10.5px] font-semibold transition-all duration-150 min-w-[40px] text-center ${appleBtn}`}
          >
            {Math.round(activePage.camera.zoom * 100)}%
          </button>

          <button
            onClick={onZoomIn}
            title="Zoom In"
            className={`p-1 rounded-full transition-all duration-150 ${appleBtn}`}
          >
            <ZoomIn size={12.5} />
          </button>

          <button
            onClick={onFitToContent}
            title="Fit Content (Shift+1)"
            className="p-1 rounded-full text-[#38BDF8] hover:bg-[#0A84FF]/15 transition-all duration-150"
          >
            <Maximize2 size={12.5} />
          </button>

          <div className="h-3.5 w-px bg-current opacity-15 mx-0.5" />

          <button
            onClick={onToggleWheelMode}
            title={`Scroll Wheel Mode: ${wheelMode === 'zoom' ? 'Zoom' : 'Pan'}`}
            className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium transition ${appleBtn}`}
          >
            {wheelMode === 'zoom' ? 'Zoom' : 'Pan'}
          </button>

          <button
            onClick={onToggleMinimap}
            title="Toggle Minimap Radar"
            className={`p-1 rounded-full transition-all duration-150 ${
              isMinimapOpen ? 'bg-[#0A84FF]/25 text-[#38BDF8]' : appleBtn
            }`}
          >
            <MapIcon size={12.5} />
          </button>
        </div>
      </div>

      {/* 5. BOTTOM-RIGHT CORNER: Infinite Pages + New Page + UI Hide */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed bottom-2.5 right-2.5 z-40 flex items-center gap-0.5 px-1.5 py-1 rounded-full max-w-[calc(100vw-190px)] ${appleCapsule}`}
      >
        <button
          onClick={onPrevPage}
          disabled={activeIndex <= 0}
          title="Previous Page (Alt+Left)"
          className={`p-1 rounded-full disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 shrink-0 ${appleBtn}`}
        >
          <ChevronLeft size={13} />
        </button>

        <div
          ref={pageStripRef}
          className="relative flex items-center gap-0.5 overflow-x-auto no-scrollbar max-w-[120px] sm:max-w-[220px]"
        >
          {pages.map((pg) => {
            const isCurrent = pg.id === activePage.id;
            return (
              <div
                key={pg.id}
                ref={isCurrent ? activeTabRef : undefined}
                onClick={() => onSelectPage(pg.id)}
                title={pg.title}
                className={`group shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-150 ${
                  isCurrent
                    ? 'lavish-active-tool text-white font-semibold'
                    : appleBtn
                }`}
              >
                <span className="truncate max-w-[64px]">{pg.title}</span>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(pg.id);
                    }}
                    title="Delete Page"
                    className="opacity-0 group-hover:opacity-100 rounded-full hover:bg-black/20 p-0.5 transition"
                  >
                    <X size={9.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onNextPage}
          disabled={activeIndex >= pages.length - 1}
          title="Next Page (Alt+Right)"
          className={`p-1 rounded-full disabled:opacity-25 disabled:pointer-events-none transition-all duration-150 shrink-0 ${appleBtn}`}
        >
          <ChevronRight size={13} />
        </button>

        <button
          onClick={onCreatePage}
          title="Create New Infinity Sheet (Alt+N)"
          className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#0A84FF]/20 to-[#5E5CE6]/20 hover:from-[#0A84FF] hover:to-[#5E5CE6] border border-[#0A84FF]/40 text-[#38BDF8] hover:text-white text-[11px] font-semibold transition-all duration-150 shrink-0 ml-0.5"
        >
          <Plus size={12} />
          <span>Sheet</span>
        </button>

        <div className="h-3.5 w-px bg-current opacity-15 mx-0.5 shrink-0" />

        <button
          onClick={onToggleZenMode}
          title="Hide UI (Z)"
          className={`p-1 rounded-full transition-all duration-150 shrink-0 ${appleBtn}`}
        >
          <EyeOff size={12.5} />
        </button>
      </div>
    </div>
  );
};
