import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardElement,
  BoardPage,
  CORE_THEMES,
  Camera,
  ColorAssistMode,
  GridType,
  PaletteId,
  SemanticRole,
  StyleConfig,
  ToolType,
  WheelMode,
  resolveThemeConfig,
} from './types/board';
import {
  createId,
  createNewPage,
  exportProjectJSON,
  importProjectJSON,
  loadBoardState,
  saveBoardState,
} from './utils/storage';
import {
  applyHarmonicColorToElement,
  applyRoleToElement,
  getHarmonicColor,
  harmonizePageElements,
  inferElementRole,
  resolvePalette,
} from './utils/smartTheme';
import {
  exportPageToPNG,
  exportPageToSVG,
  getElementBounds,
  getSelectionBounds,
  measureTextBlock,
  screenToWorld,
} from './utils/renderer';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { FloatingUI } from './components/FloatingUI';
import { PageOverviewModal } from './components/PageOverviewModal';
import { CommandPalette } from './components/CommandPalette';
import { OC20IntroAnimation } from './components/OC20IntroAnimation';

interface HistoryStack {
  past: BoardElement[][];
  future: BoardElement[][];
}

const DEFAULT_STYLE: StyleConfig = {
  strokeColor: '#f2f2f7',
  fillColor: 'transparent',
  strokeWidth: 2,
  opacity: 1,
  strokeStyle: 'solid',
  fillStyle: 'semi',
  renderMode: 'clean',
  fontFamily: 'sans',
  fontSize: 18,
};

export default function App() {
  const [initialState] = useState(() => {
    const loaded = loadBoardState();
    if (
      loaded.pages.length === 1 &&
      loaded.pages[0].id.startsWith('page-') &&
      typeof window !== 'undefined'
    ) {
      const hasSaved = Boolean(localStorage.getItem('infinity_board_state_v1'));
      if (!hasSaved) {
        loaded.pages[0].camera = {
          x: Math.round(window.innerWidth / 2),
          y: Math.round(window.innerHeight / 2),
          zoom: 1,
        };
      }
    }
    return loaded;
  });

  const [pages, setPages] = useState<BoardPage[]>(initialState.pages);
  const [activePageId, setActivePageId] = useState<string>(initialState.activePageId);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [isToolLocked, setIsToolLocked] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<SemanticRole>('auto');
  const [colorSequence, setColorSequence] = useState<number>(0);
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(DEFAULT_STYLE);
  const [wheelMode, setWheelMode] = useState<WheelMode>('zoom');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [imagePickerSignal, setImagePickerSignal] = useState<number>(0);

  const [zenMode, setZenMode] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const [toastText, setToastText] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));

  const historyMapRef = useRef<Record<string, HistoryStack>>({});
  const [, setHistoryTick] = useState(0);
  const saveTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) || pages[0],
    [pages, activePageId]
  );

  const activePaletteId: PaletteId = activePage.paletteId ?? 'oc20';
  const activeAssistMode: ColorAssistMode = activePage.colorAssistMode ?? 'auto-diff';
  const activeThemeCfg = resolveThemeConfig(activePage.theme);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastText(null);
    }, 2000);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveBoardState(pages, activePageId);
    }, 250);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [pages, activePageId]);

  const getPageHistory = (pageId: string): HistoryStack => {
    if (!historyMapRef.current[pageId]) {
      historyMapRef.current[pageId] = { past: [], future: [] };
    }
    return historyMapRef.current[pageId];
  };

  const activeHistory = getPageHistory(activePage.id);

  const handleChangeElements = useCallback(
    (nextElements: BoardElement[], commitHistory = true) => {
      setPages((prev) =>
        prev.map((pg) => {
          if (pg.id !== activePageId) return pg;
          if (commitHistory) {
            const stack = getPageHistory(pg.id);
            stack.past.push(pg.elements);
            if (stack.past.length > 80) stack.past.shift();
            stack.future = [];
            setHistoryTick((t) => t + 1);
          }
          return {
            ...pg,
            elements: nextElements,
            updatedAt: Date.now(),
          };
        })
      );
    },
    [activePageId]
  );

  const handleChangeCamera = useCallback(
    (camera: Camera) => {
      setPages((prev) =>
        prev.map((pg) => (pg.id === activePageId ? { ...pg, camera } : pg))
      );
    },
    [activePageId]
  );

  const handleUpdatePageMeta = useCallback(
    (patch: Partial<Pick<BoardPage, 'title' | 'theme' | 'grid' | 'camera'>>) => {
      if (patch.theme && patch.theme !== activePage.theme) {
        const oldCfg = resolveThemeConfig(activePage.theme);
        const newCfg = resolveThemeConfig(patch.theme);
        setStyleConfig((cur) =>
          cur.strokeColor.toLowerCase() === oldCfg.defaultStroke.toLowerCase()
            ? { ...cur, strokeColor: newCfg.defaultStroke }
            : cur
        );
      }
      setPages((prev) =>
        prev.map((pg) =>
          pg.id === activePageId ? { ...pg, ...patch, updatedAt: Date.now() } : pg
        )
      );
    },
    [activePageId, activePage.theme]
  );

  const handleUpdateStyle = useCallback(
    (patch: Partial<StyleConfig>) => {
      setStyleConfig((prev) => ({ ...prev, ...patch }));
      if (selectedIds.length > 0) {
        const selSet = new Set(selectedIds);
        const nextElements = activePage.elements.map((el) =>
          selSet.has(el.id) ? { ...el, ...patch } : el
        );
        handleChangeElements(nextElements, true);
      }
    },
    [selectedIds, activePage.elements, handleChangeElements]
  );

  const handleStepHarmonicColor = useCallback(
    (dir: 1 | -1 = 1, targetIdx?: number) => {
      const palette = resolvePalette(activePaletteId);
      const len = palette.nodeCycle.length;
      const nextIdx =
        targetIdx !== undefined ? targetIdx : ((colorSequence + dir) % len + len) % len;
      setColorSequence(nextIdx);
      const nextColor = getHarmonicColor(activePaletteId, nextIdx);
      setStyleConfig((prev) => ({ ...prev, strokeColor: nextColor }));

      if (selectedIds.length > 0) {
        const selSet = new Set(selectedIds);
        const nextElements = activePage.elements.map((el) =>
          selSet.has(el.id) ? applyHarmonicColorToElement(el, nextColor, nextIdx) : el
        );
        handleChangeElements(nextElements, true);
        showToast(`Applied Harmonic Color ${nextIdx + 1}`);
      } else {
        showToast(`Harmonic Color ${nextIdx + 1}`);
      }
    },
    [activePaletteId, colorSequence, selectedIds, activePage.elements, handleChangeElements, showToast]
  );

  const handleCycleTheme = useCallback(() => {
    const curId = resolveThemeConfig(activePage.theme).id;
    const idx = CORE_THEMES.indexOf(curId as (typeof CORE_THEMES)[number]);
    const nextTheme = CORE_THEMES[(idx + 1) % CORE_THEMES.length];
    const nextCfg = resolveThemeConfig(nextTheme);
    const curPal = resolvePalette(activePaletteId).id;
    let nextPal: PaletteId = activePaletteId;
    if (!nextCfg.isDark && curPal !== 'academic') {
      nextPal = 'academic';
    } else if (nextCfg.isDark && curPal === 'academic') {
      nextPal = nextTheme === 'sage' ? 'eyecare' : 'oc20';
    }
    const nextElements = harmonizePageElements(activePage.elements, nextPal, activeAssistMode);
    setStyleConfig((cur) => ({ ...cur, strokeColor: nextCfg.defaultStroke }));
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === activePageId
          ? { ...pg, theme: nextTheme, paletteId: nextPal, elements: nextElements, updatedAt: Date.now() }
          : pg
      )
    );
    showToast(`Theme: ${nextCfg.label}`);
  }, [activePage, activePaletteId, activeAssistMode, activePageId, showToast]);

  const handleCycleGrid = useCallback(() => {
    const order: GridType[] = ['dots', 'grid', 'cross', 'none'];
    const idx = order.indexOf(activePage.grid);
    const nextGrid = order[(idx + 1) % order.length];
    handleUpdatePageMeta({ grid: nextGrid });
    showToast(`Grid: ${nextGrid === 'none' ? 'Off' : nextGrid}`);
  }, [activePage.grid, handleUpdatePageMeta, showToast]);

  const handleSelectRole = useCallback(
    (role: SemanticRole) => {
      setActiveRole(role);
      if (selectedIds.length > 0) {
        const selSet = new Set(selectedIds);
        let idx = colorSequence;
        const nextElements = activePage.elements.map((el) => {
          if (!selSet.has(el.id)) return el;
          const targetRole = role === 'auto' ? inferElementRole(el) : role;
          const updated = applyRoleToElement(el, targetRole, activePaletteId, idx++);
          if (updated.type === 'text' && updated.text) {
            const measured = measureTextBlock(
              updated.text,
              updated.fontSize ?? 18,
              updated.fontFamily ?? 'sans'
            );
            return { ...updated, width: measured.width, height: measured.height };
          }
          return updated;
        });
        handleChangeElements(nextElements, true);
        showToast(`Applied "${role}" style`);
      }
    },
    [selectedIds, colorSequence, activePage.elements, activePaletteId, handleChangeElements, showToast]
  );

  const handleCycleAssistMode = useCallback(() => {
    const order: ColorAssistMode[] = ['auto-diff', 'semantic', 'manual'];
    const curIdx = order.indexOf(activeAssistMode);
    const nextMode = order[(curIdx + 1) % order.length];
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === activePageId ? { ...pg, colorAssistMode: nextMode, updatedAt: Date.now() } : pg
      )
    );
    showToast(`Color mode: ${nextMode}`);
  }, [activeAssistMode, activePageId, showToast]);

  const handleSelectPalette = useCallback(
    (id: PaletteId) => {
      const nextElements = harmonizePageElements(activePage.elements, id, activeAssistMode);
      const stack = getPageHistory(activePage.id);
      if (activePage.elements.length > 0) {
        stack.past.push(activePage.elements);
        if (stack.past.length > 80) stack.past.shift();
        stack.future = [];
        setHistoryTick((t) => t + 1);
      }
      setPages((prev) =>
        prev.map((pg) =>
          pg.id === activePageId
            ? { ...pg, paletteId: id, elements: nextElements, updatedAt: Date.now() }
            : pg
        )
      );
      showToast(`Palette: ${resolvePalette(id).name}`);
    },
    [activePage, activeAssistMode, activePageId, showToast]
  );

  const handleHarmonizePage = useCallback(() => {
    if (activePage.elements.length === 0) {
      showToast('Nothing on page yet');
      return;
    }
    const nextElements = harmonizePageElements(
      activePage.elements,
      activePaletteId,
      activeAssistMode
    );
    handleChangeElements(nextElements, true);
    showToast(`Harmonized ${activePage.elements.length} items`);
  }, [activePage.elements, activePaletteId, activeAssistMode, handleChangeElements, showToast]);

  const handleInstallApp = useCallback(async () => {
    setIsActionsOpen(false);
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const result = await installPromptEvent.userChoice;
      if (result?.outcome === 'accepted') {
        showToast('Installing OC20 Board...');
      }
      setInstallPromptEvent(null);
    } else {
      showToast('Use browser Install icon or create-desktop-shortcut.bat');
    }
  }, [installPromptEvent, showToast]);

  const handleExportOfflineHTML = useCallback(() => {
    setIsActionsOpen(false);
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>OC20 Board Offline Snapshot</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif; background: #16181d; color: #f2f2f7; padding: 24px; }
  h1 { font-size: 20px; color: #0a84ff; margin-bottom: 12px; }
  .card { background: #1c1e26; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px; margin-bottom: 14px; }
  .meta { font-size: 12px; color: #98a2b3; margin-bottom: 8px; }
  pre { background: #111318; padding: 10px; border-radius: 10px; overflow-x: auto; font-size: 12px; font-family: "SF Mono", Menlo, monospace; color: #e5e7eb; }
</style>
</head>
<body>
  <h1>OC20 Board Offline Snapshot (${pages.length} Pages)</h1>
  <p class="meta">Exported ${new Date().toLocaleString()} · Restore anytime via JSON backup.</p>
  ${pages
    .map(
      (p) => `<div class="card">
    <h2>${p.title.replace(/</g, '&lt;')}</h2>
    <div class="meta">${p.elements.length} elements · Theme: ${p.theme} · Palette: ${p.paletteId || 'oc20'}</div>
    <pre>${p.elements
      .filter((e) => e.text)
      .map((e) => `[${e.codeLanguage || e.semanticRole || e.type}] ${e.text}`)
      .join('\n\n')
      .replace(/</g, '&lt;') || '(Sketches, shapes & images)'}</pre>
  </div>`
    )
    .join('\n')}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oc20-board-snapshot-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded offline HTML snapshot');
  }, [pages, showToast]);

  const handleUndo = useCallback(() => {
    const stack = getPageHistory(activePage.id);
    if (stack.past.length === 0) return;
    const previous = stack.past.pop()!;
    stack.future.push(activePage.elements);
    setHistoryTick((t) => t + 1);
    setSelectedIds([]);
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === activePage.id ? { ...pg, elements: previous, updatedAt: Date.now() } : pg
      )
    );
  }, [activePage]);

  const handleRedo = useCallback(() => {
    const stack = getPageHistory(activePage.id);
    if (stack.future.length === 0) return;
    const next = stack.future.pop()!;
    stack.past.push(activePage.elements);
    setHistoryTick((t) => t + 1);
    setSelectedIds([]);
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === activePage.id ? { ...pg, elements: next, updatedAt: Date.now() } : pg
      )
    );
  }, [activePage]);

  const cameraAnimRef = useRef<number | null>(null);

  const animateCameraTo = useCallback(
    (target: Camera, duration = 150) => {
      if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current);
      const start = { ...activePage.camera };
      const t0 = performance.now();

      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const ease = 1 - Math.pow(1 - p, 3);
        handleChangeCamera({
          x: start.x + (target.x - start.x) * ease,
          y: start.y + (target.y - start.y) * ease,
          zoom: start.zoom + (target.zoom - start.zoom) * ease,
        });
        if (p < 1) {
          cameraAnimRef.current = requestAnimationFrame(step);
        } else {
          cameraAnimRef.current = null;
        }
      };
      cameraAnimRef.current = requestAnimationFrame(step);
    },
    [activePage.camera, handleChangeCamera]
  );

  const zoomAroundCenter = useCallback(
    (targetZoom: number) => {
      const cam = activePage.camera;
      const clamped = Math.max(0.05, Math.min(20, targetZoom));
      const cx = viewportSize.width / 2;
      const cy = viewportSize.height / 2;
      const wx = (cx - cam.x) / cam.zoom;
      const wy = (cy - cam.y) / cam.zoom;
      animateCameraTo({
        x: cx - wx * clamped,
        y: cy - wy * clamped,
        zoom: clamped,
      });
    },
    [activePage.camera, viewportSize, animateCameraTo]
  );

  const handleZoomIn = useCallback(() => {
    zoomAroundCenter(activePage.camera.zoom * 1.25);
  }, [activePage.camera.zoom, zoomAroundCenter]);

  const handleZoomOut = useCallback(() => {
    zoomAroundCenter(activePage.camera.zoom / 1.25);
  }, [activePage.camera.zoom, zoomAroundCenter]);

  const handleResetZoom = useCallback(() => {
    zoomAroundCenter(1);
  }, [zoomAroundCenter]);

  const handleFitToContent = useCallback(() => {
    const bounds = getSelectionBounds(activePage.elements);
    if (!bounds) {
      animateCameraTo({
        x: Math.round(viewportSize.width / 2),
        y: Math.round(viewportSize.height / 2),
        zoom: 1,
      });
      showToast('Centered empty board');
      return;
    }
    const pad = Math.min(viewportSize.width, viewportSize.height) * 0.14;
    const availW = Math.max(100, viewportSize.width - pad * 2);
    const availH = Math.max(100, viewportSize.height - pad * 2);
    const zoom = Math.max(
      0.08,
      Math.min(4, Math.min(availW / Math.max(10, bounds.width), availH / Math.max(10, bounds.height)))
    );
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    animateCameraTo({
      x: viewportSize.width / 2 - cx * zoom,
      y: viewportSize.height / 2 - cy * zoom,
      zoom,
    });
  }, [activePage.elements, viewportSize, animateCameraTo, showToast]);

  const handleSelectPage = useCallback((id: string) => {
    setSelectedIds([]);
    setActivePageId(id);
    setIsStyleOpen(false);
    setIsActionsOpen(false);
  }, []);

  const handleCreatePage = useCallback(() => {
    const newPg = createNewPage(pages.length + 1, {
      theme: activePage.theme,
      grid: activePage.grid,
      paletteId: activePaletteId,
      colorAssistMode: activeAssistMode,
    });
    newPg.camera = {
      x: Math.round(viewportSize.width / 2),
      y: Math.round(viewportSize.height / 2),
      zoom: 1,
    };
    setPages((prev) => [...prev, newPg]);
    setActivePageId(newPg.id);
    setSelectedIds([]);
    showToast(`Created ${newPg.title}`);
  }, [pages.length, activePage.theme, activePage.grid, activePaletteId, activeAssistMode, viewportSize, showToast]);

  const handleDuplicatePage = useCallback(
    (id: string) => {
      const source = pages.find((p) => p.id === id);
      if (!source) return;
      const copy: BoardPage = {
        ...JSON.parse(JSON.stringify(source)),
        id: createId('page'),
        title: `${source.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false,
      };
      setPages((prev) => [...prev, copy]);
      setActivePageId(copy.id);
      setSelectedIds([]);
      showToast(`Duplicated "${source.title}"`);
    },
    [pages, showToast]
  );

  const handleTogglePinPage = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((pg) => (pg.id === id ? { ...pg, pinned: !pg.pinned } : pg))
    );
  }, []);

  const handleDeletePage = useCallback(
    (id: string) => {
      if (pages.length <= 1) return;
      const idx = pages.findIndex((p) => p.id === id);
      const nextPages = pages.filter((p) => p.id !== id);
      setPages(nextPages);
      if (activePageId === id) {
        const fallback = nextPages[Math.max(0, idx - 1)] || nextPages[0];
        setActivePageId(fallback.id);
        setSelectedIds([]);
      }
      delete historyMapRef.current[id];
      showToast('Page deleted');
    },
    [pages, activePageId, showToast]
  );

  const handlePrevPage = useCallback(() => {
    const idx = pages.findIndex((p) => p.id === activePageId);
    if (idx > 0) handleSelectPage(pages[idx - 1].id);
  }, [pages, activePageId, handleSelectPage]);

  const handleNextPage = useCallback(() => {
    const idx = pages.findIndex((p) => p.id === activePageId);
    if (idx >= 0 && idx < pages.length - 1) handleSelectPage(pages[idx + 1].id);
  }, [pages, activePageId, handleSelectPage]);

  const handleClearPage = useCallback(() => {
    setIsActionsOpen(false);
    if (activePage.elements.length === 0) return;
    handleChangeElements([], true);
    setSelectedIds([]);
    showToast('Cleared current page');
  }, [activePage.elements.length, handleChangeElements, showToast]);

  const handleRestoreJSON = useCallback(
    async (file: File) => {
      setIsActionsOpen(false);
      const restored = await importProjectJSON(file);
      if (!restored) {
        showToast('Invalid backup file');
        return;
      }
      historyMapRef.current = {};
      setPages(restored.pages);
      setActivePageId(restored.activePageId);
      setSelectedIds([]);
      showToast(`Restored ${restored.pages.length} page(s)`);
    },
    [showToast]
  );

  const handleDockBlueSpace = useCallback(() => {
    const w = Math.max(420, Math.round(window.screen.availWidth * 0.38));
    const h = Math.max(360, Math.round(window.screen.availHeight * 0.5));
    const left = Math.round(window.screen.availWidth - w);
    const top = Math.round(window.screen.availHeight - h);
    const popup = window.open(
      window.location.href,
      'OC20BlueSpace',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    if (!popup) {
      showToast('Allow pop-ups to dock into Blue Space');
    } else {
      showToast('Opened Blue Space window');
    }
  }, [showToast]);

  const handleSelectTool = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    if (tool !== 'select') setSelectedIds([]);
    if (tool === 'image') {
      setImagePickerSignal((s) => s + 1);
    }
  }, []);

  const handleJumpToElement = useCallback(
    (pageId: string, element: BoardElement) => {
      if (pageId !== activePageId) {
        setActivePageId(pageId);
      }
      setSelectedIds([element.id]);
      setActiveTool('select');
      const b = getElementBounds(element);
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const targetZoom = 1.15;
      animateCameraTo({
        x: viewportSize.width / 2 - cx * targetZoom,
        y: viewportSize.height / 2 - cy * targetZoom,
        zoom: targetZoom,
      });
    },
    [activePageId, viewportSize, animateCameraTo]
  );

  const handleInsertTemplate = useCallback(
    (kind: 'math-pillar' | 'flowchart-3' | 'code-python') => {
      const center = screenToWorld(
        viewportSize.width / 2,
        viewportSize.height / 2,
        activePage.camera
      );
      const pal = resolvePalette(activePaletteId);

      if (kind === 'math-pillar') {
        const eq = 'Ψᵢ(r) = { δ_int, η_loc, j₀, σ_res },  r ∈ Ω';
        const measured = measureTextBlock(eq, 20, 'mono');
        const el: BoardElement = {
          id: createId('math'),
          type: 'text',
          x: center.x - measured.width / 2,
          y: center.y - measured.height / 2,
          width: measured.width,
          height: measured.height,
          text: eq,
          fontSize: 20,
          fontFamily: 'mono',
          strokeColor: pal.roles.math.color,
          fillColor: 'transparent',
          strokeWidth: 2,
          opacity: 1,
          strokeStyle: 'solid',
          fillStyle: 'none',
          renderMode: 'clean',
          seed: Math.floor(Math.random() * 100000),
          semanticRole: 'math',
        };
        handleChangeElements([...activePage.elements, el], true);
        setSelectedIds([el.id]);
        showToast('Inserted State Field Ψᵢ(r)');
        return;
      }

      if (kind === 'code-python') {
        const code =
          'def evaluate_field(r, params):\n    # Compute microstructural state field\n    delta, eta, j0, sigma = params\n    return (delta * j0) / (1.0 + eta + sigma)';
        const el: BoardElement = {
          id: createId('code'),
          type: 'code',
          x: center.x - 190,
          y: center.y - 60,
          width: 380,
          height: 120,
          text: code,
          codeLanguage: 'python',
          fontSize: 13.5,
          fontFamily: 'mono',
          strokeColor: pal.roles.code.color,
          fillColor: '#1c1e26',
          strokeWidth: 1.5,
          opacity: 1,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          renderMode: 'clean',
          seed: Math.floor(Math.random() * 100000),
          semanticRole: 'code',
        };
        handleChangeElements([...activePage.elements, el], true);
        setSelectedIds([el.id]);
        showToast('Inserted Python Solver Card');
        return;
      }

      // flowchart-3
      const id1 = createId('node');
      const id2 = createId('node');
      const id3 = createId('node');
      const c1 = pal.nodeCycle[0];
      const c2 = pal.nodeCycle[1 % pal.nodeCycle.length];
      const c3 = pal.nodeCycle[2 % pal.nodeCycle.length];
      const baseY = center.y - 36;

      const n1: BoardElement = {
        id: id1,
        type: 'rectangle',
        x: center.x - 240,
        y: baseY,
        width: 128,
        height: 68,
        text: '1. Input State',
        fontSize: 16,
        fontFamily: 'sans',
        strokeColor: c1,
        fillColor: c1,
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'semi',
        renderMode: 'clean',
        cornerRadius: 14,
        seed: 101,
        semanticRole: 'flowchart',
      };
      const n2: BoardElement = {
        id: id2,
        type: 'rectangle',
        x: center.x - 64,
        y: baseY,
        width: 128,
        height: 68,
        text: '2. Transform',
        fontSize: 16,
        fontFamily: 'sans',
        strokeColor: c2,
        fillColor: c2,
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'semi',
        renderMode: 'clean',
        cornerRadius: 14,
        seed: 202,
        semanticRole: 'flowchart',
      };
      const n3: BoardElement = {
        id: id3,
        type: 'rectangle',
        x: center.x + 112,
        y: baseY,
        width: 128,
        height: 68,
        text: '3. Output Ψ',
        fontSize: 16,
        fontFamily: 'sans',
        strokeColor: c3,
        fillColor: c3,
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'semi',
        renderMode: 'clean',
        cornerRadius: 14,
        seed: 303,
        semanticRole: 'flowchart',
      };
      const a1: BoardElement = {
        id: createId('arr'),
        type: 'arrow',
        x: center.x - 112,
        y: baseY + 34,
        width: 48,
        height: 0,
        points: [
          { x: 0, y: 0 },
          { x: 48, y: 0 },
        ],
        routeType: 'straight',
        startBinding: { elementId: id1, port: 'e' },
        endBinding: { elementId: id2, port: 'w' },
        strokeColor: pal.roles.connector.color,
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: 404,
        semanticRole: 'connector',
      };
      const a2: BoardElement = {
        id: createId('arr'),
        type: 'arrow',
        x: center.x + 64,
        y: baseY + 34,
        width: 48,
        height: 0,
        points: [
          { x: 0, y: 0 },
          { x: 48, y: 0 },
        ],
        routeType: 'straight',
        startBinding: { elementId: id2, port: 'e' },
        endBinding: { elementId: id3, port: 'w' },
        strokeColor: pal.roles.connector.color,
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: 505,
        semanticRole: 'connector',
      };

      handleChangeElements([...activePage.elements, n1, n2, n3, a1, a2], true);
      setSelectedIds([id1, id2, id3]);
      showToast('Inserted 3-Step Harmonic Flowchart');
    },
    [viewportSize, activePage, activePaletteId, handleChangeElements, showToast]
  );

  // Global keyboard shortcuts (Tab linked strictly to Prescribed Harmonic Colors)
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        handleStepHarmonicColor(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key === 'Escape') {
        setIsStyleOpen(false);
        setIsActionsOpen(false);
        setIsOverviewOpen(false);
        setIsCommandPaletteOpen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((v) => !v);
        return;
      }

      if (e.key === '?' || (e.key === '/' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreatePage();
        return;
      }

      if ((e.altKey && e.key === 'ArrowLeft') || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
        return;
      }

      if ((e.altKey && e.key === 'ArrowRight') || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
        return;
      }

      if (e.shiftKey && e.key === '!') {
        e.preventDefault();
        handleFitToContent();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const k = e.key.toLowerCase();
      const map: Record<string, ToolType> = {
        v: 'select',
        h: 'pan',
        p: 'pen',
        m: 'highlighter',
        e: 'eraser',
        r: 'rectangle',
        o: 'ellipse',
        d: 'diamond',
        a: 'arrow',
        l: 'line',
        t: 'text',
        c: 'code',
        i: 'image',
        n: 'sticky',
        k: 'laser',
      };
      if (map[k]) {
        handleSelectTool(map[k]);
        return;
      }
      if (k === 'g') {
        setIsOverviewOpen((v) => !v);
        return;
      }
      if (k === 'z') {
        setZenMode((z) => !z);
        return;
      }
      if (k === 'q') {
        setIsToolLocked((l) => {
          const next = !l;
          showToast(next ? 'Tool Locked — stays active' : 'Auto-Return to Select Cursor');
          return next;
        });
        return;
      }

      const roleMap: Record<string, SemanticRole> = {
        '1': 'auto',
        '2': 'title',
        '3': 'flowchart',
        '4': 'connector',
        '5': 'math',
      };
      if (roleMap[k]) {
        handleSelectRole(roleMap[k]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleStepHarmonicColor,
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleCreatePage,
    handlePrevPage,
    handleNextPage,
    handleFitToContent,
    handleSelectTool,
    handleSelectRole,
    showToast,
  ]);

  return (
    <div
      style={{ backgroundColor: activeThemeCfg.bg }}
      className="relative w-screen h-screen overflow-hidden font-sans"
    >
      <InfiniteCanvas
        page={activePage}
        activeTool={activeTool}
        isToolLocked={isToolLocked}
        styleConfig={styleConfig}
        wheelMode={wheelMode}
        activeRole={activeRole}
        colorAssistMode={activeAssistMode}
        paletteId={activePaletteId}
        colorSequence={colorSequence}
        selectedIds={selectedIds}
        imagePickerSignal={imagePickerSignal}
        onSelectIds={setSelectedIds}
        onSelectTool={handleSelectTool}
        onChangeElements={handleChangeElements}
        onChangeCamera={handleChangeCamera}
        onAdvanceColorSequence={() => setColorSequence((c) => c + 1)}
        onStepHarmonicColor={() => handleStepHarmonicColor(1)}
        onStartDrawing={() => {
          setIsStyleOpen(false);
          setIsActionsOpen(false);
        }}
        onToast={showToast}
      />

      <FloatingUI
        pages={pages}
        activePage={activePage}
        activeTool={activeTool}
        isToolLocked={isToolLocked}
        styleConfig={styleConfig}
        wheelMode={wheelMode}
        colorAssistMode={activeAssistMode}
        paletteId={activePaletteId}
        colorSequence={colorSequence}
        canInstallApp={Boolean(installPromptEvent)}
        zenMode={zenMode}
        isStyleOpen={isStyleOpen}
        isActionsOpen={isActionsOpen}
        isMinimapOpen={isMinimapOpen}
        canUndo={activeHistory.past.length > 0}
        canRedo={activeHistory.future.length > 0}
        viewportSize={viewportSize}
        onSelectTool={handleSelectTool}
        onToggleToolLock={() =>
          setIsToolLocked((l) => {
            const next = !l;
            showToast(next ? 'Tool Locked (Q)' : 'Auto-Return to Select Cursor');
            return next;
          })
        }
        onStepHarmonicColor={handleStepHarmonicColor}
        onCycleAssistMode={handleCycleAssistMode}
        onSelectPalette={handleSelectPalette}
        onCycleTheme={handleCycleTheme}
        onCycleGrid={handleCycleGrid}
        onHarmonizePage={handleHarmonizePage}
        onUpdateStyle={handleUpdateStyle}
        onUpdatePageMeta={handleUpdatePageMeta}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitToContent={handleFitToContent}
        onToggleWheelMode={() => setWheelMode((m) => (m === 'zoom' ? 'pan' : 'zoom'))}
        onToggleMinimap={() => setIsMinimapOpen((v) => !v)}
        onToggleStyle={() => {
          setIsStyleOpen((v) => !v);
          setIsActionsOpen(false);
        }}
        onToggleActions={() => {
          setIsActionsOpen((v) => !v);
          setIsStyleOpen(false);
        }}
        onToggleZenMode={() => setZenMode((z) => !z)}
        onOpenOverview={() => setIsOverviewOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onExportPNG={() => {
          setIsActionsOpen(false);
          exportPageToPNG(activePage.elements, activePage.theme, activePage.title);
          showToast('Exported PNG');
        }}
        onExportSVG={() => {
          setIsActionsOpen(false);
          exportPageToSVG(activePage.elements, activePage.theme, activePage.title);
          showToast('Exported SVG');
        }}
        onExportOfflineHTML={handleExportOfflineHTML}
        onBackupJSON={() => {
          setIsActionsOpen(false);
          exportProjectJSON(pages, activePage.id);
          showToast('Saved JSON backup');
        }}
        onRestoreJSON={handleRestoreJSON}
        onInstallApp={handleInstallApp}
        onClearPage={handleClearPage}
        onDockBlueSpace={handleDockBlueSpace}
      />

      <PageOverviewModal
        isOpen={isOverviewOpen}
        pages={pages}
        activePageId={activePage.id}
        onClose={() => setIsOverviewOpen(false)}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onDuplicatePage={handleDuplicatePage}
        onTogglePinPage={handleTogglePinPage}
        onDeletePage={handleDeletePage}
        onSelectTheme={(theme) => handleUpdatePageMeta({ theme })}
        onInsertTemplate={handleInsertTemplate}
        onReplayIntro={() => {
          setIsOverviewOpen(false);
          setIsIntroVisible(true);
        }}
      />

      <OC20IntroAnimation
        isVisible={isIntroVisible}
        onComplete={() => setIsIntroVisible(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        pages={pages}
        activePageId={activePage.id}
        isDarkTheme={activeThemeCfg.isDark}
        onClose={() => setIsCommandPaletteOpen(false)}
        onJumpToElement={handleJumpToElement}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onHarmonizePage={handleHarmonizePage}
        onCycleTheme={handleCycleTheme}
        onCycleGrid={handleCycleGrid}
        onFitToContent={handleFitToContent}
        onInsertTemplate={handleInsertTemplate}
        onExportPNG={() => exportPageToPNG(activePage.elements, activePage.theme, activePage.title)}
        onExportSVG={() => exportPageToSVG(activePage.elements, activePage.theme, activePage.title)}
      />

      {toastText && (
        <div className="pointer-events-none fixed bottom-14 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-[#1c1e26]/95 border border-white/15 text-slate-100 text-[11px] font-medium shadow-2xl backdrop-blur-2xl">
          {toastText}
        </div>
      )}
    </div>
  );
}
