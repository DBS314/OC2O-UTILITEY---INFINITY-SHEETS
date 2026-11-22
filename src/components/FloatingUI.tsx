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
  Link2,
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
    { id: 'select', label: 'Select', shortcut: 'V', icon: <MousePointer2 size={14} /> },
    { id: 'pan', label: 'Pan', shortcut: 'H', icon: <Hand size={14} /> },
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
    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: <ArrowUpRight size={14} /> },
    { id: 'line', label: 'Line', shortcut: 'L', icon: <Minus size={14} className="-rotate-45" /> },
  ],
  [
    { id: 'text', label: 'Text & Math', shortcut: 'T', icon: <Type size={14} /> },
    { id: 'code', label: 'Code Block', shortcut: 'C', icon: <Code2 size={14} /> },
    { id: 'image', label: 'Image', shortcut: 'I', icon: <ImagePlus size={14} /> },
    { id: 'sticky', label: 'Note', shortcut: 'N', icon: <StickyNote size={14} /> },
    { id: 'laser', label: 'Laser', shortcut: 'K', icon: <Sparkles size={14} /> },
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
  const activeHarmonicColor = activePalette.nodeCycle[activeHarmonicIdx] || '#007AFF';

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

  const barSurface = themeCfg.isDark
    ? 'bg-[#18191d]/95 border-white/[0.08] text-[#e5e7eb]'
    : 'bg-[#fcfcfd]/95 border-black/[0.09] text-[#1d1d1f]';

  const floatSurface = themeCfg.isDark
    ? 'pro-bar-dark text-[#e5e7eb]'
    : 'pro-bar-light text-[#1d1d1f]';

  const popoverSurface = themeCfg.isDark
    ? 'pro-popover-dark text-[#f2f2f7]'
    : 'pro-popover-light text-[#1d1d1f]';

  const iconBtn = themeCfg.isDark
    ? 'text-[#a1a1aa] hover:text-white hover:bg-white/[0.08]'
    : 'text-[#52525b] hover:text-[#111827] hover:bg-black/[0.06]';

  const activeBtn = themeCfg.isDark
    ? 'bg-[#007AFF] text-white'
    : 'bg-[#1d1d1f] text-white';

  const stopEvents = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  if (zenMode) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-40 p-2 flex items-end justify-end"
        onPointerDown={stopEvents}
      >
        <button
          onClick={onToggleZenMode}
          title="Show UI (Z)"
          className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${floatSurface}`}
        >
          <Eye size={12.5} />
          <span>Show UI</span>
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SHARED STUDIO POPOVER (Clean, Restraint-First Inspector)
     ═══════════════════════════════════════════════════════════════════════════ */
  const renderStudioPopover = (posClass: string) =>
    isStyleOpen ? (
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed ${posClass} w-[min(272px,calc(100vw-16px))] max-h-[calc(100vh-96px)] overflow-y-auto thin-scrollbar rounded-xl p-2.5 z-50 space-y-2.5 text-xs ${popoverSurface}`}
      >
        <div
          className={`grid grid-cols-3 gap-0.5 p-0.5 rounded-lg ${
            themeCfg.isDark ? 'bg-black/30' : 'bg-black/[0.05]'
          }`}
        >
          {(
            [
              { id: 'atmosphere', label: 'Surface' },
              { id: 'palettes', label: 'Colors' },
              { id: 'craft', label: 'Style' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStudioTab(tab.id)}
              className={`py-1 rounded-md text-[11px] font-medium transition ${
                studioTab === tab.id ? activeBtn : 'opacity-70 hover:opacity-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {studioTab === 'atmosphere' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              {CORE_THEMES.map((t) => {
                const cfg = THEME_CONFIGS[t];
                const isSelected = resolveThemeConfig(activePage.theme).id === t;
                return (
                  <button
                    key={t}
                    onClick={() => onUpdatePageMeta({ theme: t })}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition ${
                      isSelected
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : themeCfg.isDark
                          ? 'border-white/[0.08] hover:bg-white/[0.04]'
                          : 'border-black/[0.08] hover:bg-black/[0.03]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded border border-current/20 shrink-0"
                      style={{ backgroundColor: cfg.bg }}
                    />
                    <span className="text-[11px] font-medium truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-55 font-semibold mb-1">
                Grid
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['dots', 'grid', 'cross', 'none'] as GridType[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => onUpdatePageMeta({ grid: g })}
                    className={`py-1 rounded-md border text-[10.5px] capitalize transition ${
                      activePage.grid === g
                        ? `${activeBtn} border-transparent font-medium`
                        : themeCfg.isDark
                          ? 'border-white/[0.08] hover:bg-white/[0.05]'
                          : 'border-black/[0.08] hover:bg-black/[0.04]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {studioTab === 'palettes' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider opacity-55 font-semibold">
                Tab Color Sets
              </span>
              <button
                onClick={onCycleAssistMode}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                  themeCfg.isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]'
                }`}
              >
                {colorAssistMode}
              </button>
            </div>

            <div className="space-y-1">
              {CORE_PALETTES.map((pid) => {
                const pal = VARIABLE_PALETTES[pid];
                const selected = resolvePalette(paletteId).id === pid;
                return (
                  <button
                    key={pid}
                    onClick={() => onSelectPalette(pid)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border text-left transition ${
                      selected
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : themeCfg.isDark
                          ? 'border-white/[0.08] hover:bg-white/[0.04]'
                          : 'border-black/[0.08] hover:bg-black/[0.03]'
                    }`}
                  >
                    <span className="text-[11px] font-medium truncate">{pal.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {pal.nodeCycle.slice(0, 5).map((col) => (
                        <span
                          key={col}
                          className="w-2.5 h-2.5 rounded-sm"
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
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition ${activeBtn}`}
            >
              <Wand2 size={12} />
              <span>Apply to Sheet</span>
            </button>
          </div>
        )}

        {studioTab === 'craft' && (
          <div className="space-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-55 font-semibold mb-1.5">
                Stroke & Fill
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {STROKE_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdateStyle({ strokeColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded border transition ${
                      styleConfig.strokeColor === c
                        ? 'ring-2 ring-[#007AFF] border-white'
                        : 'border-black/20'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={styleConfig.strokeColor}
                  onChange={(e) => onUpdateStyle({ strokeColor: e.target.value })}
                  title="Custom color"
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
                    className={`w-4 h-4 rounded border relative overflow-hidden ${
                      styleConfig.fillColor === c
                        ? 'ring-2 ring-[#007AFF] border-white'
                        : 'border-current/20'
                    }`}
                  >
                    {c === 'transparent' && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-rose-500 font-bold">
                        /
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-55 font-semibold mb-1">
                  Fill
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(['none', 'semi', 'hachure', 'solid'] as FillStyle[]).map((fs) => (
                    <button
                      key={fs}
                      onClick={() => onUpdateStyle({ fillStyle: fs })}
                      className={`py-1 rounded-md border text-[10px] capitalize ${
                        styleConfig.fillStyle === fs
                          ? `${activeBtn} border-transparent font-medium`
                          : themeCfg.isDark
                            ? 'border-white/[0.08]'
                            : 'border-black/[0.08]'
                      }`}
                    >
                      {fs === 'semi' ? 'Tint' : fs}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-55 font-semibold mb-1">
                  Stroke
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(['clean', 'sketchy'] as RenderMode[]).map((rm) => (
                    <button
                      key={rm}
                      onClick={() => onUpdateStyle({ renderMode: rm })}
                      className={`py-1 rounded-md border text-[10px] capitalize ${
                        styleConfig.renderMode === rm
                          ? `${activeBtn} border-transparent font-medium`
                          : themeCfg.isDark
                            ? 'border-white/[0.08]'
                            : 'border-black/[0.08]'
                      }`}
                    >
                      {rm}
                    </button>
                  ))}
                  {(['solid', 'dashed'] as StrokeStyle[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateStyle({ strokeStyle: st })}
                      className={`py-1 rounded-md border text-[10px] capitalize ${
                        styleConfig.strokeStyle === st
                          ? `${activeBtn} border-transparent font-medium`
                          : themeCfg.isDark
                            ? 'border-white/[0.08]'
                            : 'border-black/[0.08]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-55 font-semibold mb-1">
                Typography
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
                    className={`py-1 rounded-md border text-[10px] ${
                      styleConfig.fontFamily === ff.id
                        ? `${activeBtn} border-transparent font-medium`
                        : themeCfg.isDark
                          ? 'border-white/[0.08]'
                          : 'border-black/[0.08]'
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
    ) : null;

  /* ═══════════════════════════════════════════════════════════════════════════
     SHARED ACTIONS MENU
     ═══════════════════════════════════════════════════════════════════════════ */
  const renderActionsPopover = (posClass: string) =>
    isActionsOpen ? (
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed ${posClass} w-52 max-h-[calc(100vh-96px)] overflow-y-auto thin-scrollbar rounded-xl p-1 z-50 text-xs space-y-0.5 ${popoverSurface}`}
      >
        <button
          onClick={() => {
            onOpenCommandPalette();
            onToggleActions();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <span className="flex items-center gap-2">
            <Search size={13} className="opacity-70" />
            <span>Command Palette</span>
          </span>
          <span className="font-mono text-[10px] opacity-50">⌘K</span>
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href).catch(() => {});
            onToggleActions();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <Link2 size={13} className="opacity-70" />
          <span>Copy App Link</span>
        </button>
        <button
          onClick={onDockBlueSpace}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <PictureInPicture2 size={13} className="opacity-70" />
          <span>Open Compact Window</span>
        </button>
        <button
          onClick={onInstallApp}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <Laptop size={13} className="opacity-70" />
          <span>{canInstallApp ? 'Install Desktop App' : 'Offline App Guide'}</span>
        </button>
        <div className="h-px bg-current opacity-10 my-1" />
        <button
          onClick={onExportPNG}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <ImageIcon size={13} className="opacity-70" />
          <span>Export PNG</span>
        </button>
        <button
          onClick={onExportSVG}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <Download size={13} className="opacity-70" />
          <span>Export SVG</span>
        </button>
        <button
          onClick={onExportOfflineHTML}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <FileCode2 size={13} className="opacity-70" />
          <span>Export HTML Snapshot</span>
        </button>
        <div className="h-px bg-current opacity-10 my-1" />
        <button
          onClick={onBackupJSON}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <FileJson size={13} className="opacity-70" />
          <span>Backup Workspace (.json)</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-current/10 transition text-left"
        >
          <Upload size={13} className="opacity-70" />
          <span>Restore Backup</span>
        </button>
        <div className="h-px bg-current opacity-10 my-1" />
        <button
          onClick={onClearPage}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition text-left"
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
    ) : null;

  /* ═══════════════════════════════════════════════════════════════════════════
     1. COMPACT / PIP WORKSPACE MODE — Native Edge-to-Edge 34px Top & Bottom Bars
     ═══════════════════════════════════════════════════════════════════════════ */
  if (isPipCompact) {
    return (
      <div className="pointer-events-none fixed inset-0 z-40">
        {/* Edge-to-Edge Native Top Toolbar (34px, 1px hairline border) */}
        <div
          onPointerDown={stopEvents}
          onWheel={stopEvents}
          className={`pointer-events-auto fixed top-0 left-0 right-0 h-[34px] z-40 flex items-center justify-between gap-1 px-2 border-b backdrop-blur-md ${barSurface}`}
        >
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={onOpenOverview}
              title="OC2O Infinity Sheets Hub (G)"
              aria-label="OC20 Landing Hub"
              className="flex items-center justify-center px-1.5 py-0.5 rounded bg-white border border-black/10 shrink-0"
            >
              <img src="./brand-logo.png" alt="OC20" className="h-3 w-auto object-contain block" />
            </button>

            <div className="h-3.5 w-px bg-current opacity-15 mx-0.5 shrink-0" />

            <button
              onClick={onPrevPage}
              disabled={activeIndex <= 0}
              title="Previous Sheet"
              className={`p-0.5 rounded disabled:opacity-25 ${iconBtn}`}
            >
              <ChevronLeft size={12} />
            </button>
            <button
              onClick={onOpenOverview}
              title="Switch Sheet (G)"
              className="text-[11px] font-medium px-1 max-w-[82px] truncate hover:underline underline-offset-2"
            >
              {activePage.title}
            </button>
            <button
              onClick={onNextPage}
              disabled={activeIndex >= pages.length - 1}
              title="Next Sheet"
              className={`p-0.5 rounded disabled:opacity-25 ${iconBtn}`}
            >
              <ChevronRight size={12} />
            </button>
            <button
              onClick={onCreatePage}
              title="New Sheet (Alt+N)"
              className={`p-0.5 rounded ${iconBtn}`}
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`p-1 rounded disabled:opacity-25 ${iconBtn}`}
            >
              <Undo2 size={12.5} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={`p-1 rounded disabled:opacity-25 ${iconBtn}`}
            >
              <Redo2 size={12.5} />
            </button>

            <div className="h-3.5 w-px bg-current opacity-15 mx-0.5" />

            <button
              onClick={() => onStepHarmonicColor(1)}
              title="Next Color (Tab)"
              aria-label="Step Harmonic Color"
              className={`p-1 rounded flex items-center justify-center ${iconBtn}`}
            >
              <span
                className="w-3 h-3 rounded-sm border border-current/25 block"
                style={{ backgroundColor: activeHarmonicColor }}
              />
            </button>

            <button
              onClick={onCycleTheme}
              title={`Surface: ${themeCfg.label}`}
              aria-label="Toggle Theme"
              className={`p-1 rounded ${iconBtn}`}
            >
              <span
                className="w-3 h-3 rounded-sm border border-current/30 block"
                style={{ backgroundColor: themeCfg.bg }}
              />
            </button>

            <button
              onClick={() => {
                setIsPipToolsOpen(false);
                onToggleStyle();
              }}
              title="Surface, Colors & Style"
              aria-label="Style and Palettes"
              className={`p-1 rounded transition ${isStyleOpen ? activeBtn : iconBtn}`}
            >
              <Palette size={12.5} />
            </button>

            <button
              onClick={() => {
                setIsPipToolsOpen(false);
                onToggleActions();
              }}
              title="Export & Actions"
              aria-label="More Actions"
              className={`p-1 rounded transition ${isActionsOpen ? activeBtn : iconBtn}`}
            >
              <MoreHorizontal size={12.5} />
            </button>
          </div>
        </div>

        {renderStudioPopover('right-2 top-10')}
        {renderActionsPopover('right-2 top-10')}

        {/* Extra Tools Tray */}
        {isPipToolsOpen && (
          <div
            onPointerDown={stopEvents}
            onWheel={stopEvents}
            className={`pointer-events-auto fixed bottom-10 left-2 z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg ${popoverSurface}`}
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
                  className={`w-6 h-6 rounded flex items-center justify-center transition ${
                    active ? activeBtn : iconBtn
                  }`}
                >
                  {t.icon}
                </button>
              );
            })}
            <div className="h-3.5 w-px bg-current opacity-15 mx-0.5" />
            <button
              onClick={onToggleToolLock}
              title={isToolLocked ? 'Unlock Tool (Q)' : 'Lock Tool (Q)'}
              className={`w-6 h-6 rounded flex items-center justify-center transition ${
                isToolLocked ? 'bg-amber-500/20 text-amber-500' : iconBtn
              }`}
            >
              {isToolLocked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
          </div>
        )}

        {/* Edge-to-Edge Native Bottom Tool & Status Bar (34px, 1px hairline border) */}
        <div
          onPointerDown={stopEvents}
          onWheel={stopEvents}
          className={`pointer-events-auto fixed bottom-0 left-0 right-0 h-[34px] z-40 flex items-center justify-between gap-1 px-2 border-t backdrop-blur-md ${barSurface}`}
        >
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
                  className={`w-6 h-6 rounded flex items-center justify-center transition ${
                    active ? activeBtn : iconBtn
                  }`}
                >
                  {t.icon}
                </button>
              );
            })}
            <button
              onClick={() => setIsPipToolsOpen((v) => !v)}
              title="More Tools"
              aria-label="More Tools"
              className={`w-6 h-6 rounded flex items-center justify-center transition ${
                isPipToolsOpen || pipMoreTools.some((t) => t.id === activeTool)
                  ? activeBtn
                  : iconBtn
              }`}
            >
              {pipMoreTools.some((t) => t.id === activeTool) ? (
                activeToolMeta.icon
              ) : (
                <Plus size={13} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onResetZoom}
              title="Reset Zoom to 100%"
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-medium transition ${iconBtn}`}
            >
              {Math.round(activePage.camera.zoom * 100)}%
            </button>
            <button
              onClick={onFitToContent}
              title="Fit Content (Shift+1)"
              className={`p-1 rounded transition ${iconBtn}`}
            >
              <Maximize2 size={11.5} />
            </button>
            <button
              onClick={onToggleZenMode}
              title="Hide UI (Z)"
              className={`p-1 rounded transition ${iconBtn}`}
            >
              <EyeOff size={11.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     2. FULL DESKTOP WORKSPACE MODE — Native macOS / Linear Pro Chrome
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* Native Edge-to-Edge Top Utility Bar (38px, 1px hairline border) */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed top-0 left-0 right-0 h-[38px] z-40 flex items-center justify-between gap-2 px-3 border-b backdrop-blur-md ${barSurface}`}
      >
        {/* Left: OC20 Brand + Sheets Hub + Editable Sheet Name + Undo/Redo + Command Palette */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onOpenOverview}
            title="OC2O Infinity Sheets Hub (G)"
            aria-label="OC20 Landing Hub"
            className="flex items-center justify-center px-1.5 py-0.5 rounded bg-white border border-black/10 shrink-0"
          >
            <img src="./brand-logo.png" alt="OC20" className="h-3.5 w-auto object-contain block" />
          </button>

          <button
            onClick={onOpenOverview}
            title="All Sheets (G)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition shrink-0 ${iconBtn}`}
          >
            <LayoutGrid size={12} />
            <span>{pages.length}</span>
          </button>

          <span className="opacity-25 text-xs">/</span>

          <input
            type="text"
            value={activePage.title}
            onChange={(e) => onUpdatePageMeta({ title: e.target.value })}
            aria-label="Page Title"
            className={`w-24 sm:w-32 bg-transparent text-xs font-medium px-1.5 py-0.5 rounded outline-none border border-transparent focus:border-[#007AFF] transition truncate ${
              themeCfg.isDark ? 'text-white focus:bg-white/5' : 'text-[#1d1d1f] focus:bg-black/5'
            }`}
          />

          <div className="h-3.5 w-px bg-current opacity-15 mx-1 shrink-0" />

          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1 rounded disabled:opacity-25 disabled:pointer-events-none transition ${iconBtn}`}
          >
            <Undo2 size={13.5} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-1 rounded disabled:opacity-25 disabled:pointer-events-none transition ${iconBtn}`}
          >
            <Redo2 size={13.5} />
          </button>

          <button
            onClick={onOpenCommandPalette}
            title="Command Palette (Ctrl+K)"
            aria-label="Spotlight Command Palette"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition ${iconBtn}`}
          >
            <Search size={12} />
            <span className="hidden md:inline font-mono text-[10px] opacity-65">⌘K</span>
          </button>
        </div>

        {/* Right: Tab Color Swatches + Surface + Grid + Style + Compact Window + More */}
        <div className="flex items-center gap-1 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
              themeCfg.isDark ? 'border-white/[0.08] bg-black/20' : 'border-black/[0.08] bg-black/[0.02]'
            }`}
            title="Press Tab to cycle harmonic colors"
          >
            <button
              onClick={() => onStepHarmonicColor(1)}
              className="text-[10px] font-mono opacity-65 hover:opacity-100 pr-0.5"
            >
              Tab
            </button>
            {activePalette.nodeCycle.slice(0, 5).map((col, idx) => {
              const isSelected = idx === activeHarmonicIdx;
              return (
                <button
                  key={col}
                  onClick={() => onStepHarmonicColor(1, idx)}
                  aria-label={`Harmonic color ${idx + 1}`}
                  style={{ backgroundColor: col }}
                  className={`rounded-sm transition ${
                    isSelected
                      ? 'w-3 h-3 ring-1 ring-offset-1 ring-[#007AFF]'
                      : 'w-2.5 h-2.5 opacity-70 hover:opacity-100'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-3.5 w-px bg-current opacity-15 mx-0.5" />

          <button
            onClick={onCycleTheme}
            title={`Surface: ${themeCfg.label} (click to switch)`}
            aria-label="Toggle Theme"
            className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] transition ${iconBtn}`}
          >
            <span
              className="w-3 h-3 rounded-sm border border-current/30 shrink-0"
              style={{ backgroundColor: themeCfg.bg }}
            />
            <span className="hidden lg:inline">{themeCfg.label}</span>
          </button>

          <button
            onClick={onCycleGrid}
            title={`Grid: ${activePage.grid}`}
            aria-label="Toggle Grid"
            className={`p-1.5 rounded transition ${
              activePage.grid !== 'none'
                ? themeCfg.isDark
                  ? 'text-white bg-white/[0.10]'
                  : 'text-[#1d1d1f] bg-black/[0.08]'
                : iconBtn
            }`}
          >
            <Grid3X3 size={13.5} />
          </button>

          <button
            onClick={onToggleStyle}
            title="Surface, Colors & Style"
            aria-label="Style and Palettes"
            className={`p-1.5 rounded transition ${isStyleOpen ? activeBtn : iconBtn}`}
          >
            <Palette size={13.5} />
          </button>

          <button
            onClick={onDockBlueSpace}
            title="Open Compact Window"
            className={`p-1.5 rounded transition ${iconBtn}`}
          >
            <PictureInPicture2 size={13.5} />
          </button>

          <button
            onClick={onToggleActions}
            title="Export & Actions"
            aria-label="More Actions"
            className={`p-1.5 rounded transition ${isActionsOpen ? activeBtn : iconBtn}`}
          >
            <MoreHorizontal size={13.5} />
          </button>
        </div>
      </div>

      {renderStudioPopover('right-3 top-11')}
      {renderActionsPopover('right-3 top-11')}

      {/* Floating Matte Bottom-Center Tool Rail (Clean 8px radius, zero glow) */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
        className={`pointer-events-auto fixed z-40 left-1/2 -translate-x-1/2 bottom-12 xl:bottom-3 overflow-x-auto no-scrollbar flex items-center gap-1 px-1.5 py-1 rounded-lg transition ${floatSurface}`}
      >
        {TOOL_GROUPS.map((group, gIdx) => (
          <React.Fragment key={gIdx}>
            {gIdx > 0 && <div className="h-4 w-px bg-current opacity-15 mx-0.5 shrink-0" />}
            <div className="flex items-center gap-0.5 shrink-0">
              {group.map((t) => {
                const active = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTool(t.id)}
                    title={`${t.label} (${t.shortcut})`}
                    aria-label={t.label}
                    className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition ${
                      active ? activeBtn : iconBtn
                    }`}
                  >
                    {t.icon}
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        <div className="h-4 w-px bg-current opacity-15 mx-0.5 shrink-0" />

        <button
          onClick={onToggleToolLock}
          title={isToolLocked ? 'Tool Locked (Q)' : 'Auto-Return to Select (Q to lock)'}
          aria-label="Toggle Tool Lock"
          className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition ${
            isToolLocked ? 'bg-amber-500/20 text-amber-500' : iconBtn
          }`}
        >
          {isToolLocked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </div>

      {/* Bottom-Left: Zoom & Minimap Control Bar */}
      <div className="fixed bottom-3 left-3 z-40 flex flex-col items-start gap-1.5">
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
          className={`pointer-events-auto flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[11px] ${floatSurface}`}
        >
          <button onClick={onZoomOut} title="Zoom Out" className={`p-1 rounded ${iconBtn}`}>
            <ZoomOut size={12.5} />
          </button>
          <button
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] font-medium min-w-[40px] text-center ${iconBtn}`}
          >
            {Math.round(activePage.camera.zoom * 100)}%
          </button>
          <button onClick={onZoomIn} title="Zoom In" className={`p-1 rounded ${iconBtn}`}>
            <ZoomIn size={12.5} />
          </button>
          <button
            onClick={onFitToContent}
            title="Fit Content (Shift+1)"
            className={`p-1 rounded ${iconBtn}`}
          >
            <Maximize2 size={12} />
          </button>

          <div className="h-3.5 w-px bg-current opacity-15 mx-0.5" />

          <button
            onClick={onToggleWheelMode}
            title={`Wheel: ${wheelMode}`}
            className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${iconBtn}`}
          >
            {wheelMode === 'zoom' ? 'Zoom' : 'Pan'}
          </button>

          <button
            onClick={onToggleMinimap}
            title="Minimap"
            className={`p-1 rounded ${isMinimapOpen ? activeBtn : iconBtn}`}
          >
            <MapIcon size={12} />
          </button>
        </div>
      </div>

      {/* Bottom-Right: Sheet Tabs & New Sheet */}
      <div
        onPointerDown={stopEvents}
        onWheel={stopEvents}
        className={`pointer-events-auto fixed bottom-3 right-3 z-40 flex items-center gap-0.5 px-1.5 py-1 rounded-lg max-w-[calc(100vw-200px)] ${floatSurface}`}
      >
        <button
          onClick={onPrevPage}
          disabled={activeIndex <= 0}
          title="Previous Sheet"
          className={`p-1 rounded disabled:opacity-25 shrink-0 ${iconBtn}`}
        >
          <ChevronLeft size={12.5} />
        </button>

        <div
          ref={pageStripRef}
          className="relative flex items-center gap-0.5 overflow-x-auto no-scrollbar max-w-[140px] sm:max-w-[220px]"
        >
          {pages.map((pg) => {
            const isCurrent = pg.id === activePage.id;
            return (
              <div
                key={pg.id}
                ref={isCurrent ? activeTabRef : undefined}
                onClick={() => onSelectPage(pg.id)}
                title={pg.title}
                className={`group shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition ${
                  isCurrent ? activeBtn : iconBtn
                }`}
              >
                <span className="truncate max-w-[68px]">{pg.title}</span>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(pg.id);
                    }}
                    title="Delete Sheet"
                    className="opacity-0 group-hover:opacity-100 rounded hover:bg-black/20 p-0.5 transition"
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
          title="Next Sheet"
          className={`p-1 rounded disabled:opacity-25 shrink-0 ${iconBtn}`}
        >
          <ChevronRight size={12.5} />
        </button>

        <button
          onClick={onCreatePage}
          title="New Sheet (Alt+N)"
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 ml-0.5 ${iconBtn}`}
        >
          <Plus size={12} />
          <span>Sheet</span>
        </button>

        <div className="h-3.5 w-px bg-current opacity-15 mx-0.5 shrink-0" />

        <button
          onClick={onToggleZenMode}
          title="Hide UI (Z)"
          className={`p-1 rounded shrink-0 ${iconBtn}`}
        >
          <EyeOff size={12} />
        </button>
      </div>
    </div>
  );
};
