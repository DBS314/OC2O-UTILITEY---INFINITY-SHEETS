import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Command,
  Download,
  FilePlus2,
  FunctionSquare,
  Grid3X3,
  Keyboard,
  LayoutGrid,
  Maximize2,
  Moon,
  Search,
  Sparkles,
  Wand2,
  Workflow,
  X,
} from 'lucide-react';
import { BoardElement, BoardPage } from '../types/board';

interface CommandPaletteProps {
  isOpen: boolean;
  pages: BoardPage[];
  activePageId: string;
  isDarkTheme: boolean;
  onClose: () => void;
  onJumpToElement: (pageId: string, element: BoardElement) => void;
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onHarmonizePage: () => void;
  onCycleTheme: () => void;
  onCycleGrid: () => void;
  onFitToContent: () => void;
  onInsertTemplate: (kind: 'math-pillar' | 'flowchart-3' | 'code-python') => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  shortcut?: string;
  onRun: () => void;
}

const SHORTCUTS_LIST = [
  { key: 'Tab / Shift+Tab', desc: 'Cycle Prescribed Harmonic Colours (or recolor selection)' },
  { key: 'Enter (⏎)', desc: 'Edit text directly inside selected shape, connector, or note' },
  { key: 'Double-Click', desc: 'Type text/math anywhere on canvas or inside any shape' },
  { key: 'Drag Shape Port', desc: 'Drag from N/E/S/W port to connect or auto-spawn next node' },
  { key: 'Ctrl+V', desc: 'Smart Paste Gemini/ChatGPT Markdown, LaTeX, Code, or Images' },
  { key: 'Ctrl+K / ⌘K', desc: 'Open Apple Spotlight Command & Search Palette' },
  { key: 'V · H · P · M · E', desc: 'Select · Pan · Pen · Highlighter · Eraser' },
  { key: 'R · O · D · A · L', desc: 'Rectangle · Circle · Diamond · Visio Arrow · Line' },
  { key: 'T · C · I · N · K', desc: 'Text/Math · Code Card · Add Image · Sticky · Laser' },
  { key: 'Alt+N / Alt+← →', desc: 'Create New Page / Switch Previous & Next Page' },
  { key: 'Shift+1 / Z', desc: 'Fit Content to Screen / Toggle Minimal Zen Mode' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  pages,
  activePageId,
  isDarkTheme,
  onClose,
  onJumpToElement,
  onSelectPage,
  onCreatePage,
  onHarmonizePage,
  onCycleTheme,
  onCycleGrid,
  onFitToContent,
  onInsertTemplate,
  onExportPNG,
  onExportSVG,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setShowShortcuts(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const actions = useMemo<ActionItem[]>(() => {
    const baseActions: ActionItem[] = [
      {
        id: 'tpl-flow',
        title: 'Insert Visio 3-Step Flowchart',
        subtitle: 'Spawns 3 connected harmonic nodes with Visio arrows',
        icon: <Workflow size={14} className="text-[#007AFF]" />,
        onRun: () => {
          onInsertTemplate('flowchart-3');
          onClose();
        },
      },
      {
        id: 'tpl-math',
        title: 'Insert Math State Field Ψᵢ(r)',
        subtitle: 'Ψᵢ(r) = { δ_int, η_loc, j₀, σ_res }, r ∈ Ω',
        icon: <FunctionSquare size={14} className="text-[#30D5C8]" />,
        onRun: () => {
          onInsertTemplate('math-pillar');
          onClose();
        },
      },
      {
        id: 'tpl-code',
        title: 'Insert Xcode Python / Solver Card',
        subtitle: 'Syntax-highlighted SF Mono code card',
        icon: <Code2 size={14} className="text-[#5856D6]" />,
        onRun: () => {
          onInsertTemplate('code-python');
          onClose();
        },
      },
      {
        id: 'act-harmonize',
        title: 'Harmonize Page Colors',
        subtitle: 'Automatically balance titles, flowchart nodes, lines & formulas',
        icon: <Wand2 size={14} className="text-[#FF9F0A]" />,
        onRun: () => {
          onHarmonizePage();
          onClose();
        },
      },
      {
        id: 'act-newpage',
        title: 'Create New Page',
        subtitle: `Add Page ${pages.length + 1} to infinite workspace`,
        icon: <FilePlus2 size={14} className="text-[#30D158]" />,
        shortcut: 'Alt+N',
        onRun: () => {
          onCreatePage();
          onClose();
        },
      },
      {
        id: 'act-theme',
        title: 'Switch Eye-Care Theme',
        subtitle: 'Cycle Studio Dusk, Space Carbon, Nordic Sage, Warm Ivory & Freeform',
        icon: <Moon size={14} className="text-amber-300" />,
        onRun: () => {
          onCycleTheme();
          onClose();
        },
      },
      {
        id: 'act-grid',
        title: 'Cycle Canvas Grid',
        subtitle: 'Toggle Dots, Lines, Crosshairs, or Blank canvas',
        icon: <Grid3X3 size={14} className="text-sky-400" />,
        onRun: () => {
          onCycleGrid();
          onClose();
        },
      },
      {
        id: 'act-fit',
        title: 'Fit All Content to Screen',
        subtitle: 'Smoothly zoom and center all objects on current page',
        icon: <Maximize2 size={14} className="text-emerald-400" />,
        shortcut: 'Shift+1',
        onRun: () => {
          onFitToContent();
          onClose();
        },
      },
      {
        id: 'act-png',
        title: 'Export Current Page as PNG',
        subtitle: 'High-DPI 2× resolution raster image',
        icon: <Download size={14} className="text-sky-300" />,
        onRun: () => {
          onExportPNG();
          onClose();
        },
      },
      {
        id: 'act-svg',
        title: 'Export Current Page as Vector SVG',
        subtitle: 'Crisp scalable vector graphics',
        icon: <Download size={14} className="text-indigo-300" />,
        onRun: () => {
          onExportSVG();
          onClose();
        },
      },
    ];

    // Also include all board elements with text across all pages for Spotlight search!
    const elementMatches: ActionItem[] = [];
    for (const pg of pages) {
      for (const el of pg.elements) {
        if (el.text && el.text.trim()) {
          const snippet = el.text.replace(/\s+/g, ' ').trim();
          elementMatches.push({
            id: `el-${pg.id}-${el.id}`,
            title: snippet.slice(0, 64),
            subtitle: `${pg.title} · ${el.type.toUpperCase()}`,
            icon: <Sparkles size={14} className="text-[#30D5C8]" />,
            shortcut: pg.id === activePageId ? 'Jump' : pg.title,
            onRun: () => {
              onJumpToElement(pg.id, el);
              onClose();
            },
          });
        }
      }
    }

    const pageItems: ActionItem[] = pages.map((pg) => ({
      id: `pg-${pg.id}`,
      title: `Switch to ${pg.title}`,
      subtitle: `${pg.elements.length} items · ${Math.round(pg.camera.zoom * 100)}% zoom`,
      icon: <LayoutGrid size={14} className="text-[#007AFF]" />,
      onRun: () => {
        onSelectPage(pg.id);
        onClose();
      },
    }));

    const q = query.trim().toLowerCase();
    if (!q) {
      return [...baseActions, ...elementMatches.slice(0, 5)];
    }

    return [...elementMatches, ...pageItems, ...baseActions].filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [
    pages,
    activePageId,
    query,
    onInsertTemplate,
    onHarmonizePage,
    onCreatePage,
    onCycleTheme,
    onCycleGrid,
    onFitToContent,
    onExportPNG,
    onExportSVG,
    onJumpToElement,
    onSelectPage,
    onClose,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-14 px-3"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl overflow-hidden transition-all ${
          isDarkTheme
            ? 'bg-[#222328]/95 border-white/15 text-[#f5f5f7]'
            : 'bg-white/95 border-black/10 text-[#1d1d1f]'
        }`}
      >
        {/* Spotlight Search Bar */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-current/10">
          <Search size={15} className="text-[#007AFF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (actions.length ? (i + 1) % actions.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) =>
                  actions.length ? (i - 1 + actions.length) % actions.length : 0
                );
              } else if (e.key === 'Enter' && actions[selectedIndex]) {
                e.preventDefault();
                actions[selectedIndex].onRun();
              }
            }}
            placeholder="Spotlight search text, formulas, pages, or commands..."
            className="flex-1 bg-transparent text-xs font-medium outline-none placeholder:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowShortcuts((s) => !s)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-medium transition ${
              showShortcuts
                ? 'bg-[#007AFF] text-white'
                : 'bg-current/10 opacity-80 hover:opacity-100'
            }`}
          >
            <Keyboard size={12} />
            <span>Shortcuts</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body: Shortcuts Cheat-Sheet OR Spotlight Results */}
        {showShortcuts ? (
          <div className="p-3 max-h-[60vh] overflow-y-auto thin-scrollbar space-y-1.5 text-xs">
            {SHORTCUTS_LIST.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-xl bg-current/[0.04]"
              >
                <span className="opacity-80 text-[11px]">{s.desc}</span>
                <kbd className="px-2 py-0.5 rounded-md bg-[#007AFF]/15 text-[#007AFF] font-mono text-[10.5px] font-semibold shrink-0">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-1.5 max-h-[58vh] overflow-y-auto thin-scrollbar space-y-0.5">
            {actions.length === 0 ? (
              <div className="py-8 text-center text-xs opacity-50">
                No matching items or commands found
              </div>
            ) : (
              actions.map((item, idx) => {
                const active = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={item.onRun}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition ${
                      active ? 'bg-[#007AFF] text-white' : 'hover:bg-current/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          active ? 'bg-white/20 text-white' : 'bg-current/10'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.title}</div>
                        <div
                          className={`text-[10.5px] truncate ${
                            active ? 'text-white/80' : 'opacity-60'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {item.shortcut && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                          active ? 'bg-white/20 text-white' : 'bg-current/10 opacity-70'
                        }`}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Footer Hint */}
        <div className="px-3.5 py-1.5 border-t border-current/10 flex items-center justify-between text-[10px] opacity-60">
          <span className="flex items-center gap-1">
            <Command size={10} />
            <span>↑↓ Navigate · ⏎ Run · Esc Close</span>
          </span>
          <span>Tab ⇥ Harmonic Colours</span>
        </div>
      </div>
    </div>
  );
};
