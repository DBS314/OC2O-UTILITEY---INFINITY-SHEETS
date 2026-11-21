import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BoardElement,
  BoardPage,
  Camera,
  ColorAssistMode,
  ConnectorBinding,
  FontFamily,
  PaletteId,
  Point,
  PortSide,
  SemanticRole,
  StyleConfig,
  ToolType,
  WheelMode,
  resolveThemeConfig,
} from '../types/board';
import { createId } from '../utils/storage';
import { resolveSmartElementStyle } from '../utils/smartTheme';
import { compressImageFile, measureCodeDimensions, parseLLMClipboardText } from '../utils/llmPaste';
import {
  AlignmentGuide,
  Bounds,
  ResizeHandle,
  computeAlignmentSnap,
  drawAlignmentGuides,
  drawCanvasBackground,
  drawElement,
  drawInfiniteGrid,
  findNearestPort,
  getConnectorGeometry,
  getElementBounds,
  getHandlePositions,
  getResizeHandleAt,
  getSelectionBounds,
  getShapePorts,
  hitTestElement,
  isElementVisible,
  isPortHost,
  measureTextBlock,
  normalizeRect,
  scaleElement,
  screenToWorld,
  updateBoundConnectors,
  worldToScreen,
} from '../utils/renderer';
import { TextMathStudio, StudioCommitPayload } from './TextMathStudio';
import { SelectionInspector, MorphTarget } from './SelectionInspector';

interface InfiniteCanvasProps {
  page: BoardPage;
  activeTool: ToolType;
  isToolLocked?: boolean;
  styleConfig: StyleConfig;
  wheelMode: WheelMode;
  activeRole: SemanticRole;
  colorAssistMode: ColorAssistMode;
  paletteId: PaletteId;
  colorSequence: number;
  selectedIds: string[];
  imagePickerSignal: number;
  onSelectIds: (ids: string[]) => void;
  onSelectTool: (tool: ToolType) => void;
  onChangeElements: (elements: BoardElement[], commitHistory?: boolean) => void;
  onChangeCamera: (camera: Camera) => void;
  onAdvanceColorSequence: () => void;
  onStepHarmonicColor?: () => void;
  onStartDrawing?: () => void;
  onToast?: (text: string) => void;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

interface StudioEditorState {
  elementId: string | null;
  wx: number;
  wy: number;
  boxWidth?: number;
  boxHeight?: number;
  value: string;
  mode: 'text' | 'title' | 'math' | 'code' | 'shape' | 'sticky' | 'connector';
  fontFamily: FontFamily;
  fontSize: number;
  textAlign: 'left' | 'center';
  codeLanguage: string;
  accentColor: string;
}

interface ContextMenuState {
  sx: number;
  sy: number;
  wx: number;
  wy: number;
  targetElement: BoardElement | null;
}

type InteractionMode =
  | { type: 'none' }
  | {
      type: 'pan';
      startSx: number;
      startSy: number;
      startCamX: number;
      startCamY: number;
      isRightClick?: boolean;
      moved?: boolean;
      targetEl?: BoardElement | null;
    }
  | {
      type: 'draw';
      element: BoardElement;
      startWx: number;
      startWy: number;
      autoSpawnOnEmptyDrop?: boolean;
      sourceShape?: BoardElement;
    }
  | {
      type: 'move';
      startWx: number;
      startWy: number;
      initialElements: BoardElement[];
      movedIds: string[];
      hasMoved: boolean;
      wasAlreadySelected: boolean;
      clickedElement: BoardElement;
    }
  | {
      type: 'resize';
      handle: ResizeHandle;
      initialBounds: Bounds;
      initialElements: BoardElement[];
      targetIds: string[];
      startWx: number;
      startWy: number;
    }
  | {
      type: 'connector-handle';
      elementId: string;
      which: 'start' | 'mid' | 'end';
      initialElements: BoardElement[];
    }
  | {
      type: 'crop';
      elementId: string;
      handle: ResizeHandle;
      initialEl: BoardElement;
      startWx: number;
      startWy: number;
    }
  | { type: 'marquee'; startWx: number; startWy: number; currentWx: number; currentWy: number }
  | { type: 'erase'; hoveredIds: Set<string> }
  | { type: 'laser' };

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  page,
  activeTool,
  isToolLocked = false,
  styleConfig,
  wheelMode,
  activeRole,
  colorAssistMode,
  paletteId,
  colorSequence,
  selectedIds,
  imagePickerSignal,
  onSelectIds,
  onSelectTool,
  onChangeElements,
  onChangeCamera,
  onAdvanceColorSequence,
  onStepHarmonicColor,
  onStartDrawing,
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const elementsRef = useRef<BoardElement[]>(page.elements);
  const cameraRef = useRef<Camera>(page.camera);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const styleRef = useRef<StyleConfig>(styleConfig);
  const toolRef = useRef<ToolType>(activeTool);
  const isToolLockedRef = useRef<boolean>(isToolLocked);
  const wheelModeRef = useRef<WheelMode>(wheelMode);
  const pageThemeRef = useRef(page.theme);
  const pageGridRef = useRef(page.grid);
  const activeRoleRef = useRef<SemanticRole>(activeRole);
  const colorAssistModeRef = useRef<ColorAssistMode>(colorAssistMode);
  const paletteIdRef = useRef<PaletteId>(paletteId);
  const colorSequenceRef = useRef<number>(colorSequence);

  const interactionRef = useRef<InteractionMode>({ type: 'none' });
  const hoverPortRef = useRef<{ elementId: string; port: PortSide; point: Point } | null>(null);
  const hoverElementIdRef = useRef<string | null>(null);
  const alignmentGuidesRef = useRef<AlignmentGuide[]>([]);
  const spacePressedRef = useRef(false);
  const laserTrailRef = useRef<TrailPoint[]>([]);
  const eraserTrailRef = useRef<TrailPoint[]>([]);
  const sizeRef = useRef({ width: 800, height: 600 });
  const cameraSyncRafRef = useRef<number | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');
  const [studioEditor, setStudioEditor] = useState<StudioEditorState | null>(null);
  const studioEditorRef = useRef<StudioEditorState | null>(null);
  studioEditorRef.current = studioEditor;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const isCroppingRef = useRef(false);
  isCroppingRef.current = isCropping;
  const clipboardRef = useRef<BoardElement[]>([]);

  useEffect(() => {
    elementsRef.current = page.elements;
  }, [page.elements]);

  useEffect(() => {
    cameraRef.current = page.camera;
  }, [page.camera]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    if (selectedIds.length !== 1) setIsCropping(false);
  }, [selectedIds]);

  useEffect(() => {
    styleRef.current = styleConfig;
  }, [styleConfig]);

  useEffect(() => {
    toolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    isToolLockedRef.current = isToolLocked;
  }, [isToolLocked]);

  useEffect(() => {
    wheelModeRef.current = wheelMode;
  }, [wheelMode]);

  useEffect(() => {
    pageThemeRef.current = page.theme;
    pageGridRef.current = page.grid;
  }, [page.theme, page.grid]);

  useEffect(() => {
    activeRoleRef.current = activeRole;
    colorAssistModeRef.current = colorAssistMode;
    paletteIdRef.current = paletteId;
    colorSequenceRef.current = colorSequence;
  }, [activeRole, colorAssistMode, paletteId, colorSequence]);

  useEffect(() => {
    interactionRef.current = { type: 'none' };
    setStudioEditor(null);
    setContextMenu(null);
    setIsCropping(false);
    laserTrailRef.current = [];
    eraserTrailRef.current = [];
  }, [page.id]);

  useEffect(() => {
    if (imagePickerSignal > 0) {
      imageFileInputRef.current?.click();
    }
  }, [imagePickerSignal]);

  useEffect(() => {
    if (isSpacePressed || activeTool === 'pan') {
      setCursorStyle('grab');
    } else if (activeTool === 'select') {
      setCursorStyle('default');
    } else if (activeTool === 'text' || activeTool === 'code') {
      setCursorStyle('text');
    } else {
      setCursorStyle('crosshair');
    }
  }, [activeTool, isSpacePressed]);

  const scheduleCameraSync = useCallback(
    (cam: Camera) => {
      cameraRef.current = cam;
      if (cameraSyncRafRef.current !== null) return;
      cameraSyncRafRef.current = requestAnimationFrame(() => {
        cameraSyncRafRef.current = null;
        onChangeCamera(cameraRef.current);
      });
    },
    [onChangeCamera]
  );

  // ResizeObserver for crisp high-DPI canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { width: w, height: h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Main requestAnimationFrame render loop
  useEffect(() => {
    let rafId = 0;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const { width, height } = sizeRef.current;
        const cam = cameraRef.current;
        const theme = pageThemeRef.current;
        const grid = pageGridRef.current;
        const themeCfg = resolveThemeConfig(theme);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        drawCanvasBackground(ctx, width, height, theme);

        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.scale(cam.zoom, cam.zoom);

        drawInfiniteGrid(ctx, width, height, cam, grid, theme);

        const interaction = interactionRef.current;
        const eraserHovered =
          interaction.type === 'erase' ? interaction.hoveredIds : new Set<string>();

        const editingId = studioEditorRef.current?.elementId;
        for (const el of elementsRef.current) {
          if (!isElementVisible(el, cam, width, height)) continue;
          drawElement(ctx, el, {
            isEraserHovered: eraserHovered.has(el.id),
            isEditingText: editingId === el.id,
          });
        }

        if (interaction.type === 'draw') {
          drawElement(ctx, interaction.element);
        }

        // Subtle Apple Freeform hover halo on unselected hovered element
        const hoveredId = hoverElementIdRef.current;
        if (
          hoveredId &&
          interaction.type === 'none' &&
          !selectedIdsRef.current.includes(hoveredId)
        ) {
          const hovEl = elementsRef.current.find((e) => e.id === hoveredId);
          if (hovEl) {
            const hb = getElementBounds(hovEl);
            const hPad = 4 / cam.zoom;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 122, 255, 0.36)';
            ctx.lineWidth = 1.4 / cam.zoom;
            ctx.beginPath();
            ctx.roundRect(
              hb.x - hPad,
              hb.y - hPad,
              hb.width + hPad * 2,
              hb.height + hPad * 2,
              6 / cam.zoom
            );
            ctx.stroke();
            ctx.restore();
          }
        }

        // Magnetic alignment guides while moving elements
        if (alignmentGuidesRef.current.length > 0) {
          drawAlignmentGuides(ctx, alignmentGuidesRef.current, cam.zoom);
        }

        // Draw magnetic shape ports when drawing, dragging a connector, or hovering near a shape port
        const showPorts =
          toolRef.current === 'arrow' ||
          toolRef.current === 'line' ||
          interaction.type === 'connector-handle' ||
          (interaction.type === 'draw' &&
            (interaction.element.type === 'arrow' || interaction.element.type === 'line')) ||
          Boolean(hoverPortRef.current);
        if (showPorts) {
          ctx.save();
          for (const el of elementsRef.current) {
            if (!isPortHost(el) || !isElementVisible(el, cam, width, height)) continue;
            const ports = getShapePorts(el);
            for (const side of ['n', 'e', 's', 'w'] as PortSide[]) {
              const pt = ports[side];
              const isSnapped =
                hoverPortRef.current?.elementId === el.id &&
                hoverPortRef.current?.port === side;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, (isSnapped ? 6.5 : 3.8) / cam.zoom, 0, Math.PI * 2);
              ctx.fillStyle = isSnapped ? '#30d158' : 'rgba(10, 132, 255, 0.5)';
              ctx.fill();
              if (isSnapped) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.6 / cam.zoom;
                ctx.stroke();
              }
            }
          }
          ctx.restore();
        }

        // Selection handles
        const selIds = selectedIdsRef.current;
        if (selIds.length > 0) {
          const selectedEls = elementsRef.current.filter((e) => selIds.includes(e.id));
          const singleConnector =
            selectedEls.length === 1 &&
            (selectedEls[0].type === 'line' || selectedEls[0].type === 'arrow')
              ? selectedEls[0]
              : null;

          if (singleConnector) {
            const geom = getConnectorGeometry(singleConnector);
            const r = 6 / cam.zoom;
            ctx.save();
            for (const pt of [geom.start, geom.end]) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
              ctx.fillStyle = '#007aff';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.6 / cam.zoom;
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(geom.mid.x, geom.mid.y, r * 0.92, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9f0a';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6 / cam.zoom;
            ctx.stroke();
            ctx.restore();
          } else {
            const selBounds = getSelectionBounds(selectedEls);
            if (selBounds) {
              const pad = 6 / cam.zoom;
              const bx = selBounds.x - pad;
              const by = selBounds.y - pad;
              const bw = selBounds.width + pad * 2;
              const bh = selBounds.height + pad * 2;

              ctx.save();
              ctx.strokeStyle = isCroppingRef.current ? '#ff9f0a' : '#007aff';
              ctx.lineWidth = 1.4 / cam.zoom;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.roundRect(bx, by, bw, bh, 4 / cam.zoom);
              ctx.stroke();

              const paddedBounds = { x: bx, y: by, width: bw, height: bh };
              const handles = getHandlePositions(paddedBounds);
              const hr = 4.2 / cam.zoom;
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = isCroppingRef.current ? '#ff9f0a' : '#007aff';
              ctx.lineWidth = 1.8 / cam.zoom;

              for (const pt of Object.values(handles)) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, hr, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              ctx.restore();
            }
          }
        }

        // Marquee selection box
        if (interaction.type === 'marquee') {
          const mr = normalizeRect(
            interaction.startWx,
            interaction.startWy,
            interaction.currentWx - interaction.startWx,
            interaction.currentWy - interaction.startWy
          );
          ctx.save();
          ctx.fillStyle = 'rgba(10, 132, 255, 0.12)';
          ctx.strokeStyle = 'rgba(10, 132, 255, 0.85)';
          ctx.lineWidth = 1.2 / cam.zoom;
          ctx.fillRect(mr.x, mr.y, mr.width, mr.height);
          ctx.strokeRect(mr.x, mr.y, mr.width, mr.height);
          ctx.restore();
        }

        // Fading Eraser Trail
        const now = performance.now();
        if (eraserTrailRef.current.length > 0) {
          eraserTrailRef.current = eraserTrailRef.current.filter((p) => now - p.t < 240);
          if (eraserTrailRef.current.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 1; i < eraserTrailRef.current.length; i++) {
              const p0 = eraserTrailRef.current[i - 1];
              const p1 = eraserTrailRef.current[i];
              const age = (now - p1.t) / 240;
              ctx.strokeStyle = `rgba(255, 69, 58, ${(1 - age) * 0.55})`;
              ctx.lineWidth = (10 * (1 - age * 0.6)) / cam.zoom;
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // Fading Neon Laser Trail
        if (laserTrailRef.current.length > 0) {
          laserTrailRef.current = laserTrailRef.current.filter((p) => now - p.t < 650);
          if (laserTrailRef.current.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 1; i < laserTrailRef.current.length; i++) {
              const p0 = laserTrailRef.current[i - 1];
              const p1 = laserTrailRef.current[i];
              const life = Math.max(0, 1 - (now - p1.t) / 650);
              ctx.strokeStyle = `rgba(255, 69, 58, ${life * 0.9})`;
              ctx.shadowColor = 'rgba(255, 69, 58, 0.9)';
              ctx.shadowBlur = 12;
              ctx.lineWidth = (5 * life + 1) / cam.zoom;
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.stroke();
            }
            const tip = laserTrailRef.current[laserTrailRef.current.length - 1];
            ctx.fillStyle = '#fff1f2';
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 4 / cam.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const insertImageBlobAt = useCallback(
    async (blob: Blob, clientX?: number, clientY?: number) => {
      try {
        const compressed = await compressImageFile(blob, 1280);
        const { width, height } = sizeRef.current;
        const sx = clientX ?? width / 2;
        const sy = clientY ?? height / 2;
        const center = screenToWorld(sx, sy, cameraRef.current);
        const imgEl: BoardElement = {
          id: createId('img'),
          type: 'image',
          x: center.x - compressed.width / 2,
          y: center.y - compressed.height / 2,
          width: compressed.width,
          height: compressed.height,
          imageDataUrl: compressed.dataUrl,
          imageFilter: 'none',
          imageRadius: 12,
          imageShadow: true,
          strokeColor: '#007aff',
          fillColor: 'transparent',
          strokeWidth: 1,
          opacity: 1,
          strokeStyle: 'solid',
          fillStyle: 'none',
          renderMode: 'clean',
          seed: Math.floor(Math.random() * 100000),
          crop: { x: 0, y: 0, w: 1, h: 1 },
        };
        onChangeElements([...elementsRef.current, imgEl], true);
        onSelectIds([imgEl.id]);
        onSelectTool('select');
        onToast?.('Added image to board');
      } catch {
        onToast?.('Could not load image');
      }
    },
    [onChangeElements, onSelectIds, onSelectTool, onToast]
  );

  const openEditorForElement = useCallback((el: BoardElement, initialOverrideText?: string) => {
    const b = getElementBounds(el);
    let mode: StudioEditorState['mode'] = 'text';
    if (el.type === 'code') mode = 'code';
    else if (el.type === 'sticky') mode = 'sticky';
    else if (el.type === 'line' || el.type === 'arrow') mode = 'connector';
    else if (
      el.type === 'rectangle' ||
      el.type === 'ellipse' ||
      el.type === 'diamond' ||
      el.type === 'image'
    )
      mode = 'shape';
    else if (el.semanticRole === 'title') mode = 'title';
    else if (el.semanticRole === 'math') mode = 'math';

    setStudioEditor({
      elementId: el.id,
      wx: el.type === 'line' || el.type === 'arrow' ? getConnectorGeometry(el).mid.x - 45 : b.x,
      wy:
        el.type === 'line' || el.type === 'arrow'
          ? getConnectorGeometry(el).mid.y - 12
          : mode === 'shape'
            ? b.y + Math.max(8, b.height / 2 - (el.fontSize ?? 18) * 0.7)
            : mode === 'sticky'
              ? b.y + 22
              : b.y,
      boxWidth: mode === 'shape' || mode === 'sticky' ? b.width : undefined,
      boxHeight: mode === 'shape' || mode === 'sticky' ? b.height : undefined,
      value: initialOverrideText !== undefined ? initialOverrideText : el.text || '',
      mode,
      fontFamily: el.fontFamily ?? (mode === 'math' || mode === 'code' ? 'mono' : 'sans'),
      fontSize: el.fontSize ?? (mode === 'title' ? 26 : mode === 'code' ? 13.5 : 18),
      textAlign: el.textAlign ?? (mode === 'shape' || mode === 'connector' ? 'center' : 'left'),
      codeLanguage: el.codeLanguage ?? 'python',
      accentColor: el.strokeColor,
    });
  }, []);

  const openFreshStudio = useCallback((wx: number, wy: number, initialMode?: 'text' | 'code') => {
    const mode =
      initialMode === 'code'
        ? 'code'
        : activeRoleRef.current === 'title'
          ? 'title'
          : activeRoleRef.current === 'math'
            ? 'math'
            : activeRoleRef.current === 'code'
              ? 'code'
              : 'text';
    const resolved = resolveSmartElementStyle({
      tool: mode === 'code' ? 'code' : 'text',
      text: '',
      semanticRole: activeRoleRef.current,
      colorAssistMode: colorAssistModeRef.current,
      paletteId: paletteIdRef.current,
      sequenceIndex: colorSequenceRef.current,
      baseStyle: styleRef.current,
    });
    setStudioEditor({
      elementId: null,
      wx,
      wy,
      value: '',
      mode,
      fontFamily: resolved.fontFamily,
      fontSize: resolved.fontSize,
      textAlign: 'left',
      codeLanguage: 'python',
      accentColor: resolved.strokeColor,
    });
  }, []);

  // Spacebar panning + Delete / Copy / Paste / Enter-to-Edit / Type-to-Label shortcuts
  useEffect(() => {
    const isTypingInInput = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spacePressedRef.current = true;
        setIsSpacePressed(true);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdsRef.current.length > 0) {
        e.preventDefault();
        const delSet = new Set(selectedIdsRef.current);
        const next = elementsRef.current.filter((el) => !delSet.has(el.id));
        onSelectIds([]);
        onChangeElements(next, true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onSelectIds(elementsRef.current.map((el) => el.id));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedIdsRef.current.length > 0) {
          const sel = elementsRef.current.filter((el) => selectedIdsRef.current.includes(el.id));
          clipboardRef.current = JSON.parse(JSON.stringify(sel));
          onToast?.(`Copied ${sel.length} item${sel.length > 1 ? 's' : ''}`);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedIdsRef.current.length > 0) {
          e.preventDefault();
          const clones = elementsRef.current
            .filter((el) => selectedIdsRef.current.includes(el.id))
            .map((el) => ({
              ...JSON.parse(JSON.stringify(el)),
              id: createId('el'),
              x: el.x + 22,
              y: el.y + 22,
              startBinding: undefined,
              endBinding: undefined,
              seed: Math.floor(Math.random() * 100000),
            }));
          const next = [...elementsRef.current, ...clones];
          onChangeElements(next, true);
          onSelectIds(clones.map((c) => c.id));
        }
        return;
      }

      if (e.key === 'Escape') {
        setIsCropping(false);
        setContextMenu(null);
        onSelectIds([]);
        return;
      }

      if (
        e.key === 'Enter' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        selectedIdsRef.current.length === 1 &&
        !studioEditorRef.current
      ) {
        const single = elementsRef.current.find((el) => el.id === selectedIdsRef.current[0]);
        if (single && single.type !== 'pen' && single.type !== 'highlighter') {
          e.preventDefault();
          openEditorForElement(single);
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (isTypingInInput(e.target)) return;

      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((it) => it.type.startsWith('image/'));
      if (imgItem) {
        const blob = imgItem.getAsFile();
        if (blob) {
          e.preventDefault();
          await insertImageBlobAt(blob);
          return;
        }
      }

      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (clipboardRef.current.length > 0 && !text) {
        const clones = clipboardRef.current.map((el) => ({
          ...JSON.parse(JSON.stringify(el)),
          id: createId('el'),
          x: el.x + 28,
          y: el.y + 28,
          startBinding: undefined,
          endBinding: undefined,
          seed: Math.floor(Math.random() * 100000),
        }));
        clipboardRef.current = clones;
        onChangeElements([...elementsRef.current, ...clones], true);
        onSelectIds(clones.map((c) => c.id));
        return;
      }

      if (text) {
        e.preventDefault();
        const { width, height } = sizeRef.current;
        const center = screenToWorld(width / 2, height / 2, cameraRef.current);
        const parsed = parseLLMClipboardText(
          text,
          center,
          paletteIdRef.current,
          colorAssistModeRef.current,
          styleRef.current
        );
        if (parsed.length > 0) {
          onChangeElements([...elementsRef.current, ...parsed], true);
          onSelectIds(parsed.map((p) => p.id));
          onSelectTool('select');
          onToast?.(
            parsed.length > 1
              ? `Pasted ${parsed.length} smart cards from clipboard`
              : 'Pasted onto board'
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
    };
  }, [insertImageBlobAt, onChangeElements, onSelectIds, onSelectTool, onToast, openEditorForElement]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cam = cameraRef.current;

      const shouldZoom = wheelModeRef.current === 'zoom' || e.ctrlKey || e.metaKey;
      if (shouldZoom) {
        const delta = Math.max(-180, Math.min(180, e.deltaY));
        const zoomFactor = Math.exp(-delta * 0.0018);
        const nextZoom = Math.max(0.05, Math.min(20, cam.zoom * zoomFactor));
        const worldX = (sx - cam.x) / cam.zoom;
        const worldY = (sy - cam.y) / cam.zoom;
        scheduleCameraSync({
          x: sx - worldX * nextZoom,
          y: sy - worldY * nextZoom,
          zoom: nextZoom,
        });
      } else {
        scheduleCameraSync({
          x: cam.x - e.deltaX,
          y: cam.y - e.deltaY,
          zoom: cam.zoom,
        });
      }
    },
    [scheduleCameraSync]
  );

  const handleCommitStudio = useCallback(
    (payload: StudioCommitPayload) => {
      const current = studioEditorRef.current;
      if (!current) return;
      studioEditorRef.current = null;
      setStudioEditor(null);

      const trimmed = payload.text.trimEnd();
      if (current.elementId) {
        const next = elementsRef.current
          .map((el) => {
            if (el.id !== current.elementId) return el;
            if (el.type === 'text' && !trimmed.trim()) return null;

            if (payload.mode === 'code' || el.type === 'code') {
              const dims = measureCodeDimensions(trimmed || '// code', payload.fontSize);
              return {
                ...el,
                type: 'code' as const,
                text: trimmed,
                codeLanguage: payload.codeLanguage,
                fontFamily: 'mono' as const,
                fontSize: 13.5,
                width: Math.max(el.width, dims.width),
                height: Math.max(92, dims.height),
                semanticRole: 'code' as const,
              };
            }

            if (el.type === 'text') {
              const roleForText: SemanticRole =
                payload.mode === 'title' ? 'title' : payload.mode === 'math' ? 'math' : 'auto';
              const resolved = resolveSmartElementStyle({
                tool: 'text',
                text: trimmed,
                semanticRole: roleForText,
                colorAssistMode: colorAssistModeRef.current,
                paletteId: paletteIdRef.current,
                sequenceIndex: el.colorIndex ?? colorSequenceRef.current,
                baseStyle: styleRef.current,
              });
              const measured = measureTextBlock(trimmed, payload.fontSize, payload.fontFamily);
              return {
                ...el,
                text: trimmed,
                fontSize: payload.fontSize,
                fontFamily: payload.fontFamily,
                textAlign: payload.textAlign,
                strokeColor:
                  colorAssistModeRef.current !== 'manual' && payload.mode !== 'text'
                    ? resolved.strokeColor
                    : el.strokeColor,
                semanticRole: resolved.semanticRole,
                width: measured.width,
                height: measured.height,
              };
            }

            return {
              ...el,
              text: trimmed,
              fontFamily: payload.fontFamily,
              fontSize: payload.fontSize,
            };
          })
          .filter(Boolean) as BoardElement[];
        onChangeElements(next, true);
        if (!isToolLockedRef.current) {
          onSelectTool('select');
        }
        return;
      }

      if (!trimmed.trim()) {
        if (!isToolLockedRef.current) {
          onSelectTool('select');
        }
        return;
      }

      if (payload.mode === 'code') {
        const dims = measureCodeDimensions(trimmed);
        const resolved = resolveSmartElementStyle({
          tool: 'code',
          semanticRole: 'code',
          colorAssistMode: colorAssistModeRef.current,
          paletteId: paletteIdRef.current,
          sequenceIndex: colorSequenceRef.current,
          baseStyle: styleRef.current,
        });
        const codeEl: BoardElement = {
          id: createId('code'),
          type: 'code',
          x: current.wx,
          y: current.wy,
          width: dims.width,
          height: dims.height,
          text: trimmed,
          codeLanguage: payload.codeLanguage,
          fontSize: 13.5,
          fontFamily: 'mono',
          strokeColor: resolved.strokeColor,
          fillColor: '#1c1e26',
          strokeWidth: 1.5,
          opacity: 1,
          strokeStyle: 'solid',
          fillStyle: 'solid',
          renderMode: 'clean',
          seed: Math.floor(Math.random() * 100000),
          semanticRole: 'code',
        };
        onChangeElements([...elementsRef.current, codeEl], true);
        onSelectIds([codeEl.id]);
        if (!isToolLockedRef.current) {
          onSelectTool('select');
        }
        return;
      }

      const explicitRole: SemanticRole =
        payload.mode === 'title' ? 'title' : payload.mode === 'math' ? 'math' : activeRoleRef.current;
      const resolved = resolveSmartElementStyle({
        tool: 'text',
        text: trimmed,
        semanticRole: explicitRole,
        colorAssistMode: colorAssistModeRef.current,
        paletteId: paletteIdRef.current,
        sequenceIndex: colorSequenceRef.current,
        baseStyle: styleRef.current,
      });
      const finalFontSize = payload.mode === 'text' ? resolved.fontSize : payload.fontSize;
      const finalFontFamily = payload.mode === 'text' ? resolved.fontFamily : payload.fontFamily;
      const measured = measureTextBlock(trimmed, finalFontSize, finalFontFamily);
      const newEl: BoardElement = {
        id: createId('el'),
        type: 'text',
        x: current.wx,
        y: current.wy,
        width: measured.width,
        height: measured.height,
        text: trimmed,
        textAlign: payload.textAlign,
        fontSize: finalFontSize,
        fontFamily: finalFontFamily,
        strokeColor: resolved.strokeColor,
        fillColor: 'transparent',
        strokeWidth: resolved.strokeWidth,
        opacity: styleRef.current.opacity,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: Math.floor(Math.random() * 100000),
        semanticRole: resolved.semanticRole,
        colorIndex: resolved.colorIndex,
      };
      onChangeElements([...elementsRef.current, newEl], true);
      onSelectIds([newEl.id]);
      if (!isToolLockedRef.current) {
        onSelectTool('select');
      }
    },
    [onChangeElements, onSelectIds, onSelectTool]
  );

  const spawnConnectedBranch = useCallback(
    (source: BoardElement, direction: 'up' | 'right' | 'down' | 'left') => {
      const b = getElementBounds(source);
      const gap = 64;
      const nodeW = Math.max(108, b.width);
      const nodeH = Math.max(66, b.height);
      const portMap: Record<typeof direction, { start: PortSide; end: PortSide }> = {
        up: { start: 'n', end: 's' },
        right: { start: 'e', end: 'w' },
        down: { start: 's', end: 'n' },
        left: { start: 'w', end: 'e' },
      };
      const startPort = portMap[direction].start;
      const endPort = portMap[direction].end;
      const startPt = getShapePorts(source)[startPort];

      const endX =
        direction === 'right'
          ? startPt.x + gap
          : direction === 'left'
            ? startPt.x - gap
            : startPt.x;
      const endY =
        direction === 'down'
          ? startPt.y + gap
          : direction === 'up'
            ? startPt.y - gap
            : startPt.y;

      const nextX =
        direction === 'right'
          ? endX
          : direction === 'left'
            ? endX - nodeW
            : b.x + b.width / 2 - nodeW / 2;
      const nextY =
        direction === 'down'
          ? endY
          : direction === 'up'
            ? endY - nodeH
            : b.y + b.height / 2 - nodeH / 2;

      const arrowStyle = resolveSmartElementStyle({
        tool: 'arrow',
        semanticRole: 'connector',
        colorAssistMode: colorAssistModeRef.current,
        paletteId: paletteIdRef.current,
        sequenceIndex: colorSequenceRef.current,
        baseStyle: styleRef.current,
      });

      const targetType =
        source.type === 'rectangle' || source.type === 'ellipse' || source.type === 'diamond'
          ? source.type
          : 'rectangle';

      const nodeStyle = resolveSmartElementStyle({
        tool: targetType,
        semanticRole: 'flowchart',
        colorAssistMode: colorAssistModeRef.current,
        paletteId: paletteIdRef.current,
        sequenceIndex: colorSequenceRef.current,
        baseStyle: styleRef.current,
      });

      const nodeId = createId('el');
      const arrowEl: BoardElement = {
        id: createId('el'),
        type: 'arrow',
        x: startPt.x,
        y: startPt.y,
        width: endX - startPt.x,
        height: endY - startPt.y,
        points: [
          { x: 0, y: 0 },
          { x: endX - startPt.x, y: endY - startPt.y },
        ],
        routeType: 'straight',
        startBinding: { elementId: source.id, port: startPort },
        endBinding: { elementId: nodeId, port: endPort },
        strokeColor: arrowStyle.strokeColor,
        fillColor: 'transparent',
        strokeWidth: arrowStyle.strokeWidth,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: source.renderMode,
        seed: Math.floor(Math.random() * 100000),
        semanticRole: 'connector',
      };

      const nodeEl: BoardElement = {
        id: nodeId,
        type: targetType,
        x: nextX,
        y: nextY,
        width: nodeW,
        height: nodeH,
        text: '',
        cornerRadius: source.cornerRadius ?? 14,
        fontSize: source.fontSize ?? styleRef.current.fontSize,
        fontFamily: source.fontFamily ?? styleRef.current.fontFamily,
        strokeColor: nodeStyle.strokeColor,
        fillColor: nodeStyle.fillColor,
        strokeWidth: nodeStyle.strokeWidth,
        opacity: 1,
        strokeStyle: source.strokeStyle,
        fillStyle: nodeStyle.fillStyle,
        renderMode: source.renderMode,
        seed: Math.floor(Math.random() * 100000),
        semanticRole: 'flowchart',
        colorIndex: nodeStyle.colorIndex,
      };

      onAdvanceColorSequence();
      const nextElements = [...elementsRef.current, arrowEl, nodeEl];
      onChangeElements(nextElements, true);
      onSelectIds([nodeEl.id]);
      onSelectTool('select');
      openEditorForElement(nodeEl);
    },
    [onAdvanceColorSequence, onChangeElements, onSelectIds, onSelectTool, openEditorForElement]
  );

  const handleMorphElement = useCallback(
    (element: BoardElement, target: MorphTarget) => {
      const b = getElementBounds(element);
      const next = elementsRef.current.map((el) => {
        if (el.id !== element.id) return el;

        if (target === 'text') {
          const measured = measureTextBlock(
            el.text || 'Text',
            el.fontSize ?? 18,
            el.fontFamily ?? 'sans'
          );
          return {
            ...el,
            type: 'text' as const,
            text: el.text || 'Text',
            width: measured.width,
            height: measured.height,
            fillColor: 'transparent',
            fillStyle: 'none' as const,
          };
        }

        const resolved = resolveSmartElementStyle({
          tool: target === 'pill' ? 'rectangle' : target,
          semanticRole: target === 'sticky' ? 'sketch' : 'flowchart',
          colorAssistMode: colorAssistModeRef.current,
          paletteId: paletteIdRef.current,
          sequenceIndex: el.colorIndex ?? colorSequenceRef.current,
          baseStyle: styleRef.current,
        });

        const paddedW = el.type === 'text' ? Math.max(136, b.width + 36) : Math.max(110, b.width);
        const paddedH = el.type === 'text' ? Math.max(72, b.height + 34) : Math.max(66, b.height);
        const nx = el.type === 'text' ? b.x - (paddedW - b.width) / 2 : b.x;
        const ny = el.type === 'text' ? b.y - (paddedH - b.height) / 2 : b.y;

        if (target === 'sticky') {
          return {
            ...el,
            type: 'sticky' as const,
            x: nx,
            y: ny,
            width: Math.max(160, paddedW),
            height: Math.max(120, paddedH),
            fillColor: resolved.fillColor === 'transparent' ? '#fef08a' : resolved.fillColor,
            fillStyle: 'solid' as const,
          };
        }

        const shapeType = target === 'pill' ? 'rectangle' : target;
        const cornerRadius = target === 'pill' ? 999 : target === 'rectangle' ? 12 : undefined;

        return {
          ...el,
          type: shapeType,
          x: nx,
          y: ny,
          width: paddedW,
          height: paddedH,
          cornerRadius,
          strokeColor: el.type === 'text' ? resolved.strokeColor : el.strokeColor,
          fillColor:
            el.fillColor === 'transparent' ? resolved.fillColor : el.fillColor,
          fillStyle: el.fillStyle === 'none' ? 'semi' : el.fillStyle,
        };
      });

      onChangeElements(updateBoundConnectors(next), true);
    },
    [onChangeElements]
  );

  const startPortDragConnector = (
    sourceEl: BoardElement,
    port: PortSide
  ) => {
    const portPt = getShapePorts(sourceEl)[port];
    const resolved = resolveSmartElementStyle({
      tool: 'arrow',
      semanticRole: 'connector',
      colorAssistMode: colorAssistModeRef.current,
      paletteId: paletteIdRef.current,
      sequenceIndex: colorSequenceRef.current,
      baseStyle: styleRef.current,
    });
    const arrowEl: BoardElement = {
      id: createId('arr'),
      type: 'arrow',
      x: portPt.x,
      y: portPt.y,
      width: 0,
      height: 0,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      routeType: 'straight',
      startBinding: { elementId: sourceEl.id, port },
      strokeColor: resolved.strokeColor,
      fillColor: 'transparent',
      strokeWidth: resolved.strokeWidth,
      opacity: 1,
      strokeStyle: 'solid',
      fillStyle: 'none',
      renderMode: sourceEl.renderMode,
      seed: Math.floor(Math.random() * 100000),
      semanticRole: 'connector',
    };
    interactionRef.current = {
      type: 'draw',
      element: arrowEl,
      startWx: portPt.x,
      startWy: portPt.y,
      autoSpawnOnEmptyDrop: true,
      sourceShape: sourceEl,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setContextMenu(null);
    if (studioEditorRef.current) {
      return;
    }
    onStartDrawing?.();

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cam = cameraRef.current;
    const worldPt = screenToWorld(sx, sy, cam);
    const tool = toolRef.current;

    // Right click: pan if dragged, or open Apple Context Menu if clicked without moving
    if (e.button === 2) {
      const tol = 8 / cam.zoom;
      let hit: BoardElement | null = null;
      for (let i = elementsRef.current.length - 1; i >= 0; i--) {
        if (hitTestElement(worldPt.x, worldPt.y, elementsRef.current[i], tol)) {
          hit = elementsRef.current[i];
          break;
        }
      }
      interactionRef.current = {
        type: 'pan',
        startSx: sx,
        startSy: sy,
        startCamX: cam.x,
        startCamY: cam.y,
        isRightClick: true,
        moved: false,
        targetEl: hit,
      };
      return;
    }

    if (e.button === 1 || spacePressedRef.current || tool === 'pan') {
      interactionRef.current = {
        type: 'pan',
        startSx: sx,
        startSy: sy,
        startCamX: cam.x,
        startCamY: cam.y,
      };
      setCursorStyle('grabbing');
      return;
    }

    if (e.button !== 0) return;

    if (tool === 'laser') {
      interactionRef.current = { type: 'laser' };
      laserTrailRef.current.push({ x: worldPt.x, y: worldPt.y, t: performance.now() });
      return;
    }

    if (tool === 'eraser') {
      const hoveredIds = new Set<string>();
      const tol = 10 / cam.zoom;
      for (let i = elementsRef.current.length - 1; i >= 0; i--) {
        if (hitTestElement(worldPt.x, worldPt.y, elementsRef.current[i], tol)) {
          hoveredIds.add(elementsRef.current[i].id);
        }
      }
      interactionRef.current = { type: 'erase', hoveredIds };
      eraserTrailRef.current.push({ x: worldPt.x, y: worldPt.y, t: performance.now() });
      return;
    }

    // If user clicks an existing editable element while in Text tool, edit that existing element instead of overlapping!
    if (tool === 'text') {
      e.preventDefault();
      const tol = 8 / cam.zoom;
      for (let i = elementsRef.current.length - 1; i >= 0; i--) {
        const el = elementsRef.current[i];
        if (
          el.type !== 'pen' &&
          el.type !== 'highlighter' &&
          hitTestElement(worldPt.x, worldPt.y, el, tol)
        ) {
          onSelectIds([el.id]);
          openEditorForElement(el);
          return;
        }
      }
      openFreshStudio(worldPt.x, worldPt.y, 'text');
      return;
    }

    if (tool === 'code') {
      e.preventDefault();
      openFreshStudio(worldPt.x, worldPt.y, 'code');
      return;
    }

    if (tool === 'image') {
      imageFileInputRef.current?.click();
      return;
    }

    if (tool === 'select') {
      // 1) Check Visio connector handles (start / mid / end) when a single connector is selected
      if (selectedIdsRef.current.length === 1) {
        const single = elementsRef.current.find((el) => el.id === selectedIdsRef.current[0]);
        if (single && (single.type === 'line' || single.type === 'arrow')) {
          const geom = getConnectorGeometry(single);
          const tol = 11 / cam.zoom;
          if (Math.hypot(worldPt.x - geom.start.x, worldPt.y - geom.start.y) <= tol) {
            interactionRef.current = {
              type: 'connector-handle',
              elementId: single.id,
              which: 'start',
              initialElements: JSON.parse(JSON.stringify(elementsRef.current)),
            };
            return;
          }
          if (Math.hypot(worldPt.x - geom.end.x, worldPt.y - geom.end.y) <= tol) {
            interactionRef.current = {
              type: 'connector-handle',
              elementId: single.id,
              which: 'end',
              initialElements: JSON.parse(JSON.stringify(elementsRef.current)),
            };
            return;
          }
          if (Math.hypot(worldPt.x - geom.mid.x, worldPt.y - geom.mid.y) <= tol) {
            interactionRef.current = {
              type: 'connector-handle',
              elementId: single.id,
              which: 'mid',
              initialElements: JSON.parse(JSON.stringify(elementsRef.current)),
            };
            return;
          }
        }
      }

      // 2) Check resize / crop handles on active selection
      if (selectedIdsRef.current.length > 0) {
        const selectedEls = elementsRef.current.filter((el) =>
          selectedIdsRef.current.includes(el.id)
        );
        const selBounds = getSelectionBounds(selectedEls);
        if (selBounds) {
          const pad = 6 / cam.zoom;
          const padded = {
            x: selBounds.x - pad,
            y: selBounds.y - pad,
            width: selBounds.width + pad * 2,
            height: selBounds.height + pad * 2,
          };
          const handle = getResizeHandleAt(worldPt.x, worldPt.y, padded, cam.zoom);
          if (handle) {
            if (isCroppingRef.current && selectedEls.length === 1 && selectedEls[0].type === 'image') {
              interactionRef.current = {
                type: 'crop',
                elementId: selectedEls[0].id,
                handle,
                initialEl: JSON.parse(JSON.stringify(selectedEls[0])),
                startWx: worldPt.x,
                startWy: worldPt.y,
              };
            } else {
              interactionRef.current = {
                type: 'resize',
                handle,
                initialBounds: selBounds,
                initialElements: JSON.parse(JSON.stringify(elementsRef.current)),
                targetIds: [...selectedIdsRef.current],
                startWx: worldPt.x,
                startWy: worldPt.y,
              };
            }
            return;
          }
        }
      }

      // 3) Check if dragging directly from a hovered shape port to draw a Visio connector!
      const snappedPort = findNearestPort(worldPt.x, worldPt.y, elementsRef.current, 11 / cam.zoom);
      if (snappedPort) {
        const hostEl = elementsRef.current.find((el) => el.id === snappedPort.elementId);
        if (hostEl) {
          startPortDragConnector(hostEl, snappedPort.port);
          return;
        }
      }

      // 4) Hit test topmost element
      const tol = 8 / cam.zoom;
      let hit: BoardElement | null = null;
      for (let i = elementsRef.current.length - 1; i >= 0; i--) {
        if (hitTestElement(worldPt.x, worldPt.y, elementsRef.current[i], tol)) {
          hit = elementsRef.current[i];
          break;
        }
      }

      if (hit) {
        const wasAlreadySelected =
          selectedIdsRef.current.length === 1 &&
          selectedIdsRef.current[0] === hit.id &&
          !e.shiftKey &&
          !e.altKey;

        let nextSel = [...selectedIdsRef.current];
        if (e.shiftKey) {
          if (nextSel.includes(hit.id)) {
            nextSel = nextSel.filter((id) => id !== hit!.id);
          } else {
            nextSel.push(hit.id);
          }
          onSelectIds(nextSel);
        } else if (!nextSel.includes(hit.id)) {
          nextSel = [hit.id];
          onSelectIds(nextSel);
        }

        if (e.altKey && nextSel.length > 0) {
          const clones = elementsRef.current
            .filter((el) => nextSel.includes(el.id))
            .map((el) => ({
              ...JSON.parse(JSON.stringify(el)),
              id: createId('el'),
              startBinding: undefined,
              endBinding: undefined,
              seed: Math.floor(Math.random() * 100000),
            }));
          const withClones = [...elementsRef.current, ...clones];
          elementsRef.current = withClones;
          const cloneIds = clones.map((c) => c.id);
          onSelectIds(cloneIds);
          interactionRef.current = {
            type: 'move',
            startWx: worldPt.x,
            startWy: worldPt.y,
            initialElements: JSON.parse(JSON.stringify(withClones)),
            movedIds: cloneIds,
            hasMoved: false,
            wasAlreadySelected: false,
            clickedElement: hit,
          };
        } else {
          interactionRef.current = {
            type: 'move',
            startWx: worldPt.x,
            startWy: worldPt.y,
            initialElements: JSON.parse(JSON.stringify(elementsRef.current)),
            movedIds: nextSel,
            hasMoved: false,
            wasAlreadySelected,
            clickedElement: hit,
          };
        }
        return;
      }

      // 5) Empty canvas click -> marquee selection
      if (!e.shiftKey) {
        onSelectIds([]);
      }
      interactionRef.current = {
        type: 'marquee',
        startWx: worldPt.x,
        startWy: worldPt.y,
        currentWx: worldPt.x,
        currentWy: worldPt.y,
      };
      return;
    }

    // Drawing tools: pen, highlighter, rectangle, ellipse, diamond, line, arrow, sticky
    const s = styleRef.current;
    const resolved = resolveSmartElementStyle({
      tool,
      semanticRole: activeRoleRef.current,
      colorAssistMode: colorAssistModeRef.current,
      paletteId: paletteIdRef.current,
      sequenceIndex: colorSequenceRef.current,
      baseStyle: s,
    });

    let startX = worldPt.x;
    let startY = worldPt.y;
    let startBinding: ConnectorBinding | undefined;
    if (tool === 'line' || tool === 'arrow') {
      const snapped = findNearestPort(worldPt.x, worldPt.y, elementsRef.current, 20 / cam.zoom);
      if (snapped) {
        startX = snapped.point.x;
        startY = snapped.point.y;
        startBinding = { elementId: snapped.elementId, port: snapped.port };
      }
    }

    const baseEl: BoardElement = {
      id: createId('el'),
      type: tool,
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      points:
        tool === 'pen' || tool === 'highlighter'
          ? [{ x: 0, y: 0, pressure: e.pressure || 0.5 }]
          : tool === 'line' || tool === 'arrow'
            ? [
                { x: 0, y: 0 },
                { x: 0, y: 0 },
              ]
            : undefined,
      routeType: tool === 'line' || tool === 'arrow' ? 'straight' : undefined,
      startBinding,
      strokeColor: resolved.strokeColor,
      fillColor: resolved.fillColor,
      strokeWidth: resolved.strokeWidth,
      opacity: s.opacity,
      strokeStyle: s.strokeStyle,
      fillStyle: resolved.fillStyle,
      renderMode: s.renderMode,
      fontFamily: resolved.fontFamily,
      fontSize: resolved.fontSize,
      seed: Math.floor(Math.random() * 100000),
      semanticRole: resolved.semanticRole,
      colorIndex: resolved.colorIndex,
    };

    interactionRef.current = {
      type: 'draw',
      element: baseEl,
      startWx: startX,
      startWy: startY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cam = cameraRef.current;
    const worldPt = screenToWorld(sx, sy, cam);
    const inter = interactionRef.current;

    if (inter.type === 'none') {
      if (toolRef.current === 'arrow' || toolRef.current === 'line') {
        hoverPortRef.current = findNearestPort(
          worldPt.x,
          worldPt.y,
          elementsRef.current,
          20 / cam.zoom
        );
      } else if (toolRef.current === 'select' && !spacePressedRef.current) {
        hoverPortRef.current = findNearestPort(
          worldPt.x,
          worldPt.y,
          elementsRef.current,
          12 / cam.zoom
        );
        const tol = 8 / cam.zoom;
        let hitId: string | null = null;
        for (let i = elementsRef.current.length - 1; i >= 0; i--) {
          if (hitTestElement(worldPt.x, worldPt.y, elementsRef.current[i], tol)) {
            hitId = elementsRef.current[i].id;
            break;
          }
        }
        hoverElementIdRef.current = hitId;
      } else {
        hoverPortRef.current = null;
        hoverElementIdRef.current = null;
      }

      if (toolRef.current === 'select' && selectedIdsRef.current.length > 0 && !spacePressedRef.current) {
        const selectedEls = elementsRef.current.filter((el) =>
          selectedIdsRef.current.includes(el.id)
        );
        const selBounds = getSelectionBounds(selectedEls);
        if (selBounds) {
          const pad = 6 / cam.zoom;
          const padded = {
            x: selBounds.x - pad,
            y: selBounds.y - pad,
            width: selBounds.width + pad * 2,
            height: selBounds.height + pad * 2,
          };
          const handle = getResizeHandleAt(worldPt.x, worldPt.y, padded, cam.zoom);
          if (handle === 'nw' || handle === 'se') setCursorStyle('nwse-resize');
          else if (handle === 'ne' || handle === 'sw') setCursorStyle('nesw-resize');
          else if (handle === 'n' || handle === 's') setCursorStyle('ns-resize');
          else if (handle === 'e' || handle === 'w') setCursorStyle('ew-resize');
          else setCursorStyle(hoverPortRef.current ? 'crosshair' : 'default');
        }
      } else if (toolRef.current === 'select') {
        setCursorStyle(hoverPortRef.current ? 'crosshair' : 'default');
      }
      return;
    }

    if (inter.type === 'pan') {
      if (Math.hypot(sx - inter.startSx, sy - inter.startSy) > 4) {
        inter.moved = true;
      }
      scheduleCameraSync({
        x: inter.startCamX + (sx - inter.startSx),
        y: inter.startCamY + (sy - inter.startSy),
        zoom: cam.zoom,
      });
      return;
    }

    if (inter.type === 'laser') {
      laserTrailRef.current.push({ x: worldPt.x, y: worldPt.y, t: performance.now() });
      return;
    }

    if (inter.type === 'erase') {
      eraserTrailRef.current.push({ x: worldPt.x, y: worldPt.y, t: performance.now() });
      const tol = 10 / cam.zoom;
      for (const el of elementsRef.current) {
        if (!inter.hoveredIds.has(el.id) && hitTestElement(worldPt.x, worldPt.y, el, tol)) {
          inter.hoveredIds.add(el.id);
        }
      }
      return;
    }

    if (inter.type === 'marquee') {
      inter.currentWx = worldPt.x;
      inter.currentWy = worldPt.y;
      return;
    }

    if (inter.type === 'move') {
      let dx = worldPt.x - inter.startWx;
      let dy = worldPt.y - inter.startWy;
      if (Math.hypot(dx, dy) > 2.5 / cam.zoom) {
        inter.hasMoved = true;
      }
      const movedSet = new Set(inter.movedIds);
      const rawMoved = inter.initialElements.filter((el) => movedSet.has(el.id));
      const rawBounds = getSelectionBounds(
        rawMoved.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy }))
      );
      if (rawBounds && !e.altKey) {
        const snap = computeAlignmentSnap(
          rawBounds,
          inter.initialElements,
          movedSet,
          5 / cam.zoom
        );
        dx += snap.dx;
        dy += snap.dy;
        alignmentGuidesRef.current = snap.guides;
      } else {
        alignmentGuidesRef.current = [];
      }
      const movedEls = inter.initialElements.map((el) =>
        movedSet.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el
      );
      elementsRef.current = updateBoundConnectors(movedEls);
      return;
    }

    if (inter.type === 'resize') {
      const b = inter.initialBounds;
      let left = b.x;
      let top = b.y;
      let right = b.x + b.width;
      let bottom = b.y + b.height;
      const minSize = 10;

      const h = inter.handle;
      if (h.includes('w')) left = Math.min(right - minSize, worldPt.x);
      if (h.includes('e')) right = Math.max(left + minSize, worldPt.x);
      if (h.includes('n')) top = Math.min(bottom - minSize, worldPt.y);
      if (h.includes('s')) bottom = Math.max(top + minSize, worldPt.y);

      let newBounds: Bounds = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };

      if (e.shiftKey && b.width > 0 && b.height > 0) {
        const aspect = b.width / b.height;
        if (newBounds.width / newBounds.height > aspect) {
          newBounds.width = newBounds.height * aspect;
        } else {
          newBounds.height = newBounds.width / aspect;
        }
      }

      const targetSet = new Set(inter.targetIds);
      const resized = inter.initialElements.map((el) =>
        targetSet.has(el.id) ? scaleElement(el, b, newBounds) : el
      );
      elementsRef.current = updateBoundConnectors(resized);
      return;
    }

    if (inter.type === 'crop') {
      const init = inter.initialEl;
      const dx = (worldPt.x - inter.startWx) / Math.max(20, init.width);
      const dy = (worldPt.y - inter.startWy) / Math.max(20, init.height);
      const baseCrop = init.crop || { x: 0, y: 0, w: 1, h: 1 };
      const nextCrop = { ...baseCrop };
      const h = inter.handle;

      if (h.includes('w')) {
        const nx = Math.max(0, Math.min(baseCrop.x + baseCrop.w - 0.15, baseCrop.x + dx * baseCrop.w));
        nextCrop.w = baseCrop.x + baseCrop.w - nx;
        nextCrop.x = nx;
      }
      if (h.includes('e')) {
        nextCrop.w = Math.max(0.15, Math.min(1 - baseCrop.x, baseCrop.w + dx * baseCrop.w));
      }
      if (h.includes('n')) {
        const ny = Math.max(0, Math.min(baseCrop.y + baseCrop.h - 0.15, baseCrop.y + dy * baseCrop.h));
        nextCrop.h = baseCrop.y + baseCrop.h - ny;
        nextCrop.y = ny;
      }
      if (h.includes('s')) {
        nextCrop.h = Math.max(0.15, Math.min(1 - baseCrop.y, baseCrop.h + dy * baseCrop.h));
      }

      elementsRef.current = elementsRef.current.map((el) =>
        el.id === inter.elementId ? { ...el, crop: nextCrop } : el
      );
      return;
    }

    if (inter.type === 'connector-handle') {
      const snapped =
        inter.which !== 'mid'
          ? findNearestPort(worldPt.x, worldPt.y, inter.initialElements, 20 / cam.zoom, inter.elementId)
          : null;
      hoverPortRef.current = snapped;

      elementsRef.current = inter.initialElements.map((el) => {
        if (el.id !== inter.elementId) return el;
        const pts =
          el.points && el.points.length >= 2
            ? el.points
            : [
                { x: 0, y: 0 },
                { x: el.width, y: el.height },
              ];
        const startW = { x: el.x + pts[0].x, y: el.y + pts[0].y };
        const endW = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };

        if (inter.which === 'mid') {
          return {
            ...el,
            controlPoint: { x: worldPt.x - el.x, y: worldPt.y - el.y },
          };
        }

        if (inter.which === 'start') {
          const nx = snapped ? snapped.point.x : worldPt.x;
          const ny = snapped ? snapped.point.y : worldPt.y;
          return {
            ...el,
            x: nx,
            y: ny,
            width: endW.x - nx,
            height: endW.y - ny,
            points: [
              { x: 0, y: 0 },
              { x: endW.x - nx, y: endW.y - ny },
            ],
            startBinding: snapped
              ? { elementId: snapped.elementId, port: snapped.port }
              : undefined,
          };
        }

        const ex = snapped ? snapped.point.x : worldPt.x;
        const ey = snapped ? snapped.point.y : worldPt.y;
        return {
          ...el,
          width: ex - startW.x,
          height: ey - startW.y,
          points: [
            { x: 0, y: 0 },
            { x: ex - startW.x, y: ey - startW.y },
          ],
          endBinding: snapped
            ? { elementId: snapped.elementId, port: snapped.port }
            : undefined,
        };
      });
      return;
    }

    if (inter.type === 'draw') {
      const el = inter.element;
      if (el.type === 'pen' || el.type === 'highlighter') {
        const pts = el.points || [];
        const rx = worldPt.x - el.x;
        const ry = worldPt.y - el.y;
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(rx - last.x, ry - last.y) >= 1.5 / cam.zoom) {
          pts.push({ x: rx, y: ry, pressure: e.pressure || 0.5 });
        }
      } else if (el.type === 'line' || el.type === 'arrow') {
        const snapped = findNearestPort(
          worldPt.x,
          worldPt.y,
          elementsRef.current,
          20 / cam.zoom,
          el.startBinding?.elementId
        );
        hoverPortRef.current = snapped;
        let dx = (snapped ? snapped.point.x : worldPt.x) - inter.startWx;
        let dy = (snapped ? snapped.point.y : worldPt.y) - inter.startWy;
        if (e.shiftKey && !snapped) {
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
          const len = Math.hypot(dx, dy);
          dx = Math.cos(snappedAngle) * len;
          dy = Math.sin(snappedAngle) * len;
        }
        el.points = [
          { x: 0, y: 0 },
          { x: dx, y: dy },
        ];
        el.width = dx;
        el.height = dy;
        el.endBinding = snapped ? { elementId: snapped.elementId, port: snapped.port } : undefined;
      } else {
        let w = worldPt.x - inter.startWx;
        let h = worldPt.y - inter.startWy;
        if (e.shiftKey) {
          const side = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * side;
          h = Math.sign(h || 1) * side;
        }
        const norm = normalizeRect(inter.startWx, inter.startWy, w, h);
        el.x = norm.x;
        el.y = norm.y;
        el.width = norm.width;
        el.height = norm.height;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    const inter = interactionRef.current;
    interactionRef.current = { type: 'none' };
    hoverPortRef.current = null;
    alignmentGuidesRef.current = [];

    if (inter.type === 'pan') {
      setCursorStyle(spacePressedRef.current || toolRef.current === 'pan' ? 'grab' : 'default');
      // Quick right-click without dragging -> Open Apple Context Menu!
      if (inter.isRightClick && !inter.moved && canvas) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wPt = screenToWorld(sx, sy, cameraRef.current);
        if (inter.targetEl) {
          onSelectIds([inter.targetEl.id]);
        }
        setContextMenu({
          sx,
          sy,
          wx: wPt.x,
          wy: wPt.y,
          targetElement: inter.targetEl ?? null,
        });
      }
      return;
    }

    if (inter.type === 'erase') {
      if (inter.hoveredIds.size > 0) {
        const next = elementsRef.current.filter((el) => !inter.hoveredIds.has(el.id));
        onChangeElements(next, true);
      }
      return;
    }

    if (inter.type === 'marquee') {
      const mr = normalizeRect(
        inter.startWx,
        inter.startWy,
        inter.currentWx - inter.startWx,
        inter.currentWy - inter.startWy
      );
      if (mr.width > 4 || mr.height > 4) {
        const hits = elementsRef.current
          .filter((el) => {
            const b = getElementBounds(el);
            return (
              b.x < mr.x + mr.width &&
              b.x + b.width > mr.x &&
              b.y < mr.y + mr.height &&
              b.y + b.height > mr.y
            );
          })
          .map((el) => el.id);
        onSelectIds(hits);
      }
      return;
    }

    if (inter.type === 'move') {
      if (inter.hasMoved) {
        onChangeElements([...elementsRef.current], true);
      } else if (
        inter.wasAlreadySelected &&
        inter.clickedElement.type !== 'pen' &&
        inter.clickedElement.type !== 'highlighter' &&
        inter.clickedElement.type !== 'image'
      ) {
        // Single-click on an already-selected text/shape/sticky/arrow opens inline editing immediately!
        openEditorForElement(inter.clickedElement);
      }
      return;
    }

    if (inter.type === 'resize' || inter.type === 'connector-handle' || inter.type === 'crop') {
      onChangeElements([...elementsRef.current], true);
      return;
    }

    if (inter.type === 'draw') {
      const el = inter.element;
      if (el.type === 'pen' || el.type === 'highlighter') {
        const pts = el.points || [];
        if (pts.length > 0) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
          const normalized: BoardElement = {
            ...el,
            x: el.x + minX,
            y: el.y + minY,
            width: Math.max(4, maxX - minX),
            height: Math.max(4, maxY - minY),
            points: pts.map((p) => ({
              x: p.x - minX,
              y: p.y - minY,
              pressure: p.pressure,
            })),
          };
          onChangeElements([...elementsRef.current, normalized], true);
          if (el.type === 'highlighter') {
            onAdvanceColorSequence();
          }
        }
        return;
      }

      if (el.type === 'line' || el.type === 'arrow') {
        const pts = el.points || [];
        const dist = pts.length >= 2 ? Math.hypot(pts[1].x, pts[1].y) : 0;
        if (dist >= 5) {
          // If dragged from a shape port onto empty canvas space, auto-spawn a connected next node!
          if (inter.autoSpawnOnEmptyDrop && !el.endBinding && inter.sourceShape && dist >= 32) {
            const src = inter.sourceShape;
            const sb = getElementBounds(src);
            const nodeW = Math.max(116, sb.width);
            const nodeH = Math.max(66, sb.height);
            const tipX = el.x + pts[1].x;
            const tipY = el.y + pts[1].y;
            const dx = pts[1].x;
            const dy = pts[1].y;
            let endPort: PortSide = 'w';
            let nodeX = tipX;
            let nodeY = tipY - nodeH / 2;

            if (Math.abs(dx) >= Math.abs(dy)) {
              if (dx >= 0) {
                endPort = 'w';
                nodeX = tipX;
                nodeY = tipY - nodeH / 2;
              } else {
                endPort = 'e';
                nodeX = tipX - nodeW;
                nodeY = tipY - nodeH / 2;
              }
            } else if (dy >= 0) {
              endPort = 'n';
              nodeX = tipX - nodeW / 2;
              nodeY = tipY;
            } else {
              endPort = 's';
              nodeX = tipX - nodeW / 2;
              nodeY = tipY - nodeH;
            }

            const targetType =
              src.type === 'rectangle' || src.type === 'ellipse' || src.type === 'diamond'
                ? src.type
                : 'rectangle';
            const nodeStyle = resolveSmartElementStyle({
              tool: targetType,
              semanticRole: 'flowchart',
              colorAssistMode: colorAssistModeRef.current,
              paletteId: paletteIdRef.current,
              sequenceIndex: colorSequenceRef.current,
              baseStyle: styleRef.current,
            });
            const nodeId = createId('node');
            const newNode: BoardElement = {
              id: nodeId,
              type: targetType,
              x: nodeX,
              y: nodeY,
              width: nodeW,
              height: nodeH,
              text: '',
              cornerRadius: src.cornerRadius ?? 14,
              fontSize: src.fontSize ?? styleRef.current.fontSize,
              fontFamily: src.fontFamily ?? styleRef.current.fontFamily,
              strokeColor: nodeStyle.strokeColor,
              fillColor: nodeStyle.fillColor,
              strokeWidth: nodeStyle.strokeWidth,
              opacity: 1,
              strokeStyle: src.strokeStyle,
              fillStyle: nodeStyle.fillStyle,
              renderMode: src.renderMode,
              seed: Math.floor(Math.random() * 100000),
              semanticRole: 'flowchart',
              colorIndex: nodeStyle.colorIndex,
            };
            const boundArrow: BoardElement = {
              ...el,
              endBinding: { elementId: nodeId, port: endPort },
            };
            onAdvanceColorSequence();
            onChangeElements([...elementsRef.current, boundArrow, newNode], true);
            onSelectIds([nodeId]);
            onSelectTool('select');
            openEditorForElement(newNode);
            return;
          }

          onChangeElements([...elementsRef.current, el], true);
          onSelectIds([el.id]);
          if (!isToolLockedRef.current) {
            onSelectTool('select');
          }
        }
        return;
      }

      let finalEl = { ...el };
      if (finalEl.width < 8 && finalEl.height < 8) {
        const defaultW = finalEl.type === 'sticky' ? 170 : 136;
        const defaultH = finalEl.type === 'sticky' ? 130 : 76;
        finalEl.x -= defaultW / 2;
        finalEl.y -= defaultH / 2;
        finalEl.width = defaultW;
        finalEl.height = defaultH;
      }
      onChangeElements([...elementsRef.current, finalEl], true);
      onAdvanceColorSequence();
      onSelectIds([finalEl.id]);
      // Auto-switch back to Select cursor (Excalidraw / Miro workflow) unless tool is locked
      if (!isToolLockedRef.current) {
        onSelectTool('select');
      }
      if (finalEl.type === 'sticky') {
        openEditorForElement(finalEl);
      }
    }
  };

  // Double-click from ANY tool edits existing element or spawns inline text on empty canvas
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = screenToWorld(sx, sy, cameraRef.current);
    const tol = 10 / cameraRef.current.zoom;

    for (let i = elementsRef.current.length - 1; i >= 0; i--) {
      const el = elementsRef.current[i];
      if (
        el.type !== 'pen' &&
        el.type !== 'highlighter' &&
        hitTestElement(worldPt.x, worldPt.y, el, tol)
      ) {
        onSelectTool('select');
        onSelectIds([el.id]);
        openEditorForElement(el);
        return;
      }
    }

    onSelectTool('select');
    openFreshStudio(worldPt.x, worldPt.y, toolRef.current === 'code' ? 'code' : 'text');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files || []).find((f) => f.type.startsWith('image/'));
    if (file) {
      await insertImageBlobAt(file, e.clientX, e.clientY);
    }
  };

  const singleSelectedElement =
    selectedIds.length === 1
      ? page.elements.find((el) => el.id === selectedIds[0])
      : undefined;

  const isSingleBranchableShape =
    singleSelectedElement &&
    (singleSelectedElement.type === 'rectangle' ||
      singleSelectedElement.type === 'ellipse' ||
      singleSelectedElement.type === 'diamond' ||
      singleSelectedElement.type === 'sticky');

  const branchPortsScreen = isSingleBranchableShape
    ? (() => {
        const ports = getShapePorts(singleSelectedElement);
        return {
          n: worldToScreen(ports.n.x, ports.n.y, page.camera),
          e: worldToScreen(ports.e.x, ports.e.y, page.camera),
          s: worldToScreen(ports.s.x, ports.s.y, page.camera),
          w: worldToScreen(ports.w.x, ports.w.y, page.camera),
        };
      })()
    : null;

  const editorScreenPos = studioEditor
    ? worldToScreen(studioEditor.wx, studioEditor.wy, page.camera)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-none"
        style={{ cursor: cursorStyle }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Hidden Image File Picker */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await insertImageBlobAt(file);
          e.target.value = '';
        }}
      />

      {/* 4-Direction On-Canvas Quick-Branch & Drag-to-Connect `+` Dots Around Selected Shape */}
      {isSingleBranchableShape && branchPortsScreen && !studioEditor && (
        <>
          {(
            [
              { dir: 'up', port: 'n', pt: branchPortsScreen.n, dx: -10, dy: -26, label: '+' },
              { dir: 'right', port: 'e', pt: branchPortsScreen.e, dx: 10, dy: -10, label: '+' },
              { dir: 'down', port: 's', pt: branchPortsScreen.s, dx: -10, dy: 10, label: '+' },
              { dir: 'left', port: 'w', pt: branchPortsScreen.w, dx: -28, dy: -10, label: '+' },
            ] as const
          ).map((item) => (
            <button
              key={item.dir}
              type="button"
              title={`Click to add node ${item.dir}, or drag to connect`}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                spawnConnectedBranch(singleSelectedElement, item.dir);
              }}
              style={{
                left: `${item.pt.x + item.dx}px`,
                top: `${item.pt.y + item.dy}px`,
              }}
              className="fixed z-20 w-5 h-5 rounded-full bg-[#007AFF]/90 hover:bg-[#007AFF] hover:scale-125 text-white border border-white/80 shadow-md text-xs font-bold flex items-center justify-center transition-all duration-150"
            >
              {item.label}
            </button>
          ))}
        </>
      )}

      {/* Visio / Image / Code Context Inspector */}
      {singleSelectedElement && !studioEditor && (
        <SelectionInspector
          element={singleSelectedElement}
          camera={page.camera}
          viewportSize={sizeRef.current}
          isDarkTheme={resolveThemeConfig(page.theme).isDark}
          paletteId={paletteId}
          isCropping={isCropping}
          onEditElement={openEditorForElement}
          onUpdateElement={(patch) => {
            const next = elementsRef.current.map((el) =>
              el.id === singleSelectedElement.id ? { ...el, ...patch } : el
            );
            onChangeElements(next, true);
          }}
          onApplyColor={(hex) => {
            const next = elementsRef.current.map((el) => {
              if (el.id !== singleSelectedElement.id) return el;
              return {
                ...el,
                strokeColor: hex,
                fillColor:
                  el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond'
                    ? hex
                    : el.fillColor,
              };
            });
            onChangeElements(next, true);
          }}
          onMorphElement={(target) => handleMorphElement(singleSelectedElement, target)}
          onSwapConnector={() => {
            const el = singleSelectedElement;
            const geom = getConnectorGeometry(el);
            const next = elementsRef.current.map((item) => {
              if (item.id !== el.id) return item;
              return {
                ...item,
                x: geom.end.x,
                y: geom.end.y,
                width: geom.start.x - geom.end.x,
                height: geom.start.y - geom.end.y,
                points: [
                  { x: 0, y: 0 },
                  { x: geom.start.x - geom.end.x, y: geom.start.y - geom.end.y },
                ],
                startBinding: item.endBinding,
                endBinding: item.startBinding,
                controlPoint: item.controlPoint
                  ? {
                      x: item.x + item.controlPoint.x - geom.end.x,
                      y: item.y + item.controlPoint.y - geom.end.y,
                    }
                  : undefined,
              };
            });
            onChangeElements(next, true);
          }}
          onSpawnBranch={(dir) => spawnConnectedBranch(singleSelectedElement, dir)}
          onBringToFront={() => {
            const rest = elementsRef.current.filter((el) => el.id !== singleSelectedElement.id);
            onChangeElements([...rest, singleSelectedElement], true);
          }}
          onToggleCrop={() => setIsCropping((c) => !c)}
          onCopyCode={(txt) => {
            navigator.clipboard?.writeText(txt).catch(() => {});
            onToast?.('Code copied to clipboard');
          }}
          onDuplicate={() => {
            const clone: BoardElement = {
              ...JSON.parse(JSON.stringify(singleSelectedElement)),
              id: createId('el'),
              x: singleSelectedElement.x + 24,
              y: singleSelectedElement.y + 24,
              startBinding: undefined,
              endBinding: undefined,
              seed: Math.floor(Math.random() * 100000),
            };
            onChangeElements([...elementsRef.current, clone], true);
            onSelectIds([clone.id]);
          }}
          onDelete={() => {
            const next = elementsRef.current.filter((el) => el.id !== singleSelectedElement.id);
            onSelectIds([]);
            onChangeElements(next, true);
          }}
        />
      )}

      {/* Apple macOS Right-Click Context Menu */}
      {contextMenu && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            left: `${Math.min(sizeRef.current.width - 190, Math.max(8, contextMenu.sx))}px`,
            top: `${Math.min(sizeRef.current.height - 220, Math.max(8, contextMenu.sy))}px`,
          }}
          className="fixed z-50 w-44 rounded-2xl bg-[#25262b]/95 border border-white/15 shadow-2xl p-1.5 backdrop-blur-2xl text-xs text-[#f5f5f7] space-y-0.5"
        >
          {contextMenu.targetElement ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const target = contextMenu.targetElement!;
                  setContextMenu(null);
                  openEditorForElement(target);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                <span>Edit Text</span>
                <span className="text-[10px] opacity-60">⏎</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  onStepHarmonicColor?.();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                <span>Next Harmonic Color</span>
                <span className="text-[10px] opacity-60">Tab</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = contextMenu.targetElement!;
                  setContextMenu(null);
                  handleMorphElement(
                    target,
                    target.type === 'text'
                      ? 'pill'
                      : target.type === 'rectangle'
                        ? 'diamond'
                        : 'text'
                  );
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                <span>Convert Shape / Text</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                onClick={() => {
                  const target = contextMenu.targetElement!;
                  setContextMenu(null);
                  const clone: BoardElement = {
                    ...JSON.parse(JSON.stringify(target)),
                    id: createId('el'),
                    x: target.x + 24,
                    y: target.y + 24,
                    startBinding: undefined,
                    endBinding: undefined,
                    seed: Math.floor(Math.random() * 100000),
                  };
                  onChangeElements([...elementsRef.current, clone], true);
                  onSelectIds([clone.id]);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                <span>Duplicate</span>
                <span className="text-[10px] opacity-60">⌘D</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = contextMenu.targetElement!;
                  setContextMenu(null);
                  onSelectIds([]);
                  onChangeElements(
                    elementsRef.current.filter((el) => el.id !== target.id),
                    true
                  );
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 transition text-left"
              >
                <span>Delete</span>
                <span className="text-[10px] opacity-60">Del</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  const { wx, wy } = contextMenu;
                  setContextMenu(null);
                  openFreshStudio(wx, wy, 'text');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                Add Text / Math Here
              </button>
              <button
                type="button"
                onClick={() => {
                  const { wx, wy } = contextMenu;
                  setContextMenu(null);
                  const resolved = resolveSmartElementStyle({
                    tool: 'rectangle',
                    semanticRole: 'flowchart',
                    colorAssistMode: colorAssistModeRef.current,
                    paletteId: paletteIdRef.current,
                    sequenceIndex: colorSequenceRef.current,
                    baseStyle: styleRef.current,
                  });
                  const box: BoardElement = {
                    id: createId('box'),
                    type: 'rectangle',
                    x: wx - 68,
                    y: wy - 36,
                    width: 136,
                    height: 72,
                    cornerRadius: 14,
                    text: '',
                    fontSize: 18,
                    fontFamily: 'sans',
                    strokeColor: resolved.strokeColor,
                    fillColor: resolved.fillColor,
                    strokeWidth: 2,
                    opacity: 1,
                    strokeStyle: 'solid',
                    fillStyle: 'semi',
                    renderMode: 'clean',
                    seed: Math.floor(Math.random() * 100000),
                    semanticRole: 'flowchart',
                  };
                  onAdvanceColorSequence();
                  onChangeElements([...elementsRef.current, box], true);
                  onSelectIds([box.id]);
                  openEditorForElement(box);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                Add Flowchart Box Here
              </button>
              <button
                type="button"
                onClick={() => {
                  const { wx, wy } = contextMenu;
                  setContextMenu(null);
                  const note: BoardElement = {
                    id: createId('note'),
                    type: 'sticky',
                    x: wx - 85,
                    y: wy - 65,
                    width: 170,
                    height: 130,
                    text: '',
                    fontSize: 16,
                    fontFamily: 'sans',
                    strokeColor: '#1d1d1f',
                    fillColor: '#fef08a',
                    strokeWidth: 1,
                    opacity: 1,
                    strokeStyle: 'solid',
                    fillStyle: 'solid',
                    renderMode: 'clean',
                    seed: Math.floor(Math.random() * 100000),
                  };
                  onChangeElements([...elementsRef.current, note], true);
                  onSelectIds([note.id]);
                  openEditorForElement(note);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                Add Sticky Note Here
              </button>
              <button
                type="button"
                onClick={() => {
                  const { wx, wy } = contextMenu;
                  setContextMenu(null);
                  openFreshStudio(wx, wy, 'code');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#007AFF] transition text-left"
              >
                Add Code Card Here
              </button>
            </>
          )}
        </div>
      )}

      {/* Interactive Apple Text & Math Studio (Excalidraw-Native Direct On-Canvas Editing) */}
      {studioEditor && editorScreenPos && (
        <TextMathStudio
          initialValue={studioEditor.value}
          initialMode={studioEditor.mode}
          initialFontFamily={studioEditor.fontFamily}
          initialFontSize={studioEditor.fontSize}
          initialTextAlign={studioEditor.textAlign}
          initialCodeLanguage={studioEditor.codeLanguage}
          screenX={editorScreenPos.x}
          screenY={editorScreenPos.y}
          boxWidth={studioEditor.boxWidth}
          boxHeight={studioEditor.boxHeight}
          zoom={page.camera.zoom}
          isDarkTheme={resolveThemeConfig(page.theme).isDark}
          viewportSize={sizeRef.current}
          accentColor={studioEditor.accentColor}
          onCommit={handleCommitStudio}
          onCancel={() => {
            studioEditorRef.current = null;
            setStudioEditor(null);
            if (!isToolLockedRef.current) {
              onSelectTool('select');
            }
          }}
        />
      )}
    </div>
  );
};
