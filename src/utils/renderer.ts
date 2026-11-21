import {
  BoardElement,
  Camera,
  FontFamily,
  GridType,
  Point,
  PortSide,
  ThemeType,
  resolveThemeConfig,
} from '../types/board';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement | null {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function screenToWorld(sx: number, sy: number, camera: Camera): Point {
  return {
    x: (sx - camera.x) / camera.zoom,
    y: (sy - camera.y) / camera.zoom,
  };
}

export function worldToScreen(wx: number, wy: number, camera: Camera): Point {
  return {
    x: wx * camera.zoom + camera.x,
    y: wy * camera.zoom + camera.y,
  };
}

function createRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getFontStack(family: FontFamily = 'sans'): string {
  switch (family) {
    case 'mono':
      return '"SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace';
    case 'serif':
      return '"New York", "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, serif';
    case 'rounded':
    case 'hand':
      return '"SF Pro Rounded", "Arial Rounded MT Bold", -apple-system, system-ui, sans-serif';
    case 'sans':
    default:
      return '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';
  }
}

export function isElementVisible(
  element: BoardElement,
  camera: Camera,
  viewportW: number,
  viewportH: number
): boolean {
  const b = getElementBounds(element);
  const margin = 48 / camera.zoom;
  const worldLeft = -camera.x / camera.zoom - margin;
  const worldTop = -camera.y / camera.zoom - margin;
  const worldRight = (viewportW - camera.x) / camera.zoom + margin;
  const worldBottom = (viewportH - camera.y) / camera.zoom + margin;

  return (
    b.x + b.width >= worldLeft &&
    b.x <= worldRight &&
    b.y + b.height >= worldTop &&
    b.y <= worldBottom
  );
}

export function drawCanvasBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemeType
): void {
  const themeCfg = resolveThemeConfig(theme);
  ctx.save();

  // Base subtle diagonal gradient
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0, themeCfg.bg);
  baseGrad.addColorStop(1, themeCfg.bgSecondary || themeCfg.bg);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Atmospheric ambient light pools
  const maxDim = Math.max(width, height);
  for (const glow of themeCfg.ambientGlows || []) {
    const cx = width * glow.xRatio;
    const cy = height * glow.yRatio;
    const r = maxDim * glow.radiusRatio;
    const radGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, r);
    radGrad.addColorStop(0, glow.color);
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Subtle drifting crystalline winter snow motes when Nordic Winter theme is active
  if (themeCfg.id === 'winter') {
    const now = performance.now() * 0.00025;
    const count = 34;
    for (let i = 0; i < count; i++) {
      const seedX = ((i * 137.5) % 100) / 100;
      const seedY = ((i * 293.7) % 100) / 100;
      const driftX = Math.sin(now * 2.1 + i * 1.3) * 18;
      const fallY = ((seedY + now * (0.4 + (i % 4) * 0.14)) % 1) * height;
      const px = (seedX * width + driftX + width) % width;
      const radius = 0.8 + (i % 3) * 0.55;
      const alpha = 0.10 + (i % 4) * 0.045;
      ctx.fillStyle = `rgba(224, 242, 254, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, fallY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawInfiniteGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
  gridType: GridType,
  theme: ThemeType
): void {
  if (gridType === 'none') return;

  const themeCfg = resolveThemeConfig(theme);
  let step = 32;
  while (step * camera.zoom < 18) step *= 2;
  while (step * camera.zoom > 96) step /= 2;

  const majorStep = step * 4;

  const worldLeft = -camera.x / camera.zoom;
  const worldTop = -camera.y / camera.zoom;
  const worldRight = (width - camera.x) / camera.zoom;
  const worldBottom = (height - camera.y) / camera.zoom;

  const startX = Math.floor(worldLeft / step) * step;
  const startY = Math.floor(worldTop / step) * step;

  ctx.save();

  if (gridType === 'dots') {
    const minorSize = 1.35 / camera.zoom;
    const majorSize = 2.1 / camera.zoom;
    for (let x = startX; x <= worldRight; x += step) {
      const isMajorX = Math.abs(Math.round(x / majorStep) * majorStep - x) < 0.001;
      for (let y = startY; y <= worldBottom; y += step) {
        const isMajorY = Math.abs(Math.round(y / majorStep) * majorStep - y) < 0.001;
        const isMajor = isMajorX && isMajorY;
        ctx.fillStyle = isMajor ? themeCfg.gridMajorColor : themeCfg.gridColor;
        const r = isMajor ? majorSize : minorSize;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gridType === 'grid') {
    ctx.lineWidth = 1 / camera.zoom;
    for (let x = startX; x <= worldRight; x += step) {
      const isMajor = Math.abs(Math.round(x / majorStep) * majorStep - x) < 0.001;
      ctx.strokeStyle = isMajor ? themeCfg.gridMajorColor : themeCfg.gridColor;
      ctx.beginPath();
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
      ctx.stroke();
    }
    for (let y = startY; y <= worldBottom; y += step) {
      const isMajor = Math.abs(Math.round(y / majorStep) * majorStep - y) < 0.001;
      ctx.strokeStyle = isMajor ? themeCfg.gridMajorColor : themeCfg.gridColor;
      ctx.beginPath();
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
      ctx.stroke();
    }
  } else if (gridType === 'cross') {
    ctx.lineWidth = 1.1 / camera.zoom;
    const arm = 3.5 / camera.zoom;
    for (let x = startX; x <= worldRight; x += step) {
      const isMajorX = Math.abs(Math.round(x / majorStep) * majorStep - x) < 0.001;
      for (let y = startY; y <= worldBottom; y += step) {
        const isMajorY = Math.abs(Math.round(y / majorStep) * majorStep - y) < 0.001;
        ctx.strokeStyle = isMajorX && isMajorY ? themeCfg.gridMajorColor : themeCfg.gridColor;
        ctx.beginPath();
        ctx.moveTo(x - arm, y);
        ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm);
        ctx.lineTo(x, y + arm);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function getDashArray(style: BoardElement['strokeStyle'], strokeWidth: number): number[] {
  if (style === 'dashed') return [Math.max(8, strokeWidth * 3.5), Math.max(6, strokeWidth * 2.5)];
  if (style === 'dotted') return [Math.max(1.5, strokeWidth * 0.8), Math.max(5, strokeWidth * 2.4)];
  return [];
}

function sketchLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: () => number,
  roughness = 1.4,
  doubleStroke = true
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return;
  const maxOffset = Math.min(roughness * 1.8, len * 0.06);

  const drawPass = (mult: number) => {
    const ox1 = (rng() - 0.5) * maxOffset * mult;
    const oy1 = (rng() - 0.5) * maxOffset * mult;
    const ox2 = (rng() - 0.5) * maxOffset * mult;
    const oy2 = (rng() - 0.5) * maxOffset * mult;
    const midX = (x1 + x2) / 2 + (rng() - 0.5) * maxOffset * 1.6 * mult;
    const midY = (y1 + y2) / 2 + (rng() - 0.5) * maxOffset * 1.6 * mult;

    ctx.beginPath();
    ctx.moveTo(x1 + ox1, y1 + oy1);
    ctx.quadraticCurveTo(midX, midY, x2 + ox2, y2 + oy2);
    ctx.stroke();
  };

  drawPass(1);
  if (doubleStroke) {
    ctx.save();
    ctx.globalAlpha *= 0.65;
    drawPass(1.15);
    ctx.restore();
  }
}

function drawHachureFill(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds,
  fillColor: string,
  strokeWidth: number,
  rng: () => number,
  clipPathFn: () => void
): void {
  ctx.save();
  clipPathFn();
  ctx.clip();

  ctx.strokeStyle = fillColor;
  ctx.globalAlpha *= 0.34;
  ctx.lineWidth = Math.max(1, strokeWidth * 0.65);
  ctx.setLineDash([]);

  const gap = Math.max(7, strokeWidth * 3.5);
  const totalSpan = bounds.width + bounds.height;
  for (let d = -bounds.height; d <= totalSpan; d += gap) {
    const x1 = bounds.x + d;
    const y1 = bounds.y;
    const x2 = bounds.x + d - bounds.height;
    const y2 = bounds.y + bounds.height;
    sketchLine(ctx, x1, y1, x2, y2, rng, 0.9, false);
  }
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return `rgba(10, 132, 255, ${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyFill(
  ctx: CanvasRenderingContext2D,
  element: BoardElement,
  bounds: Bounds,
  rng: () => number,
  pathFn: () => void
): void {
  if (!element.fillColor || element.fillColor === 'transparent' || element.fillStyle === 'none') {
    return;
  }
  if (element.fillStyle === 'solid') {
    ctx.save();
    ctx.shadowColor = hexToRgba(element.fillColor, 0.28);
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    pathFn();
    ctx.fillStyle = element.fillColor;
    ctx.fill();
    ctx.restore();
  } else if (element.fillStyle === 'semi') {
    ctx.save();
    ctx.shadowColor = hexToRgba(element.fillColor, 0.22);
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    pathFn();
    const grad = ctx.createLinearGradient(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height
    );
    grad.addColorStop(0, hexToRgba(element.fillColor, 0.28));
    grad.addColorStop(0.5, hexToRgba(element.fillColor, 0.16));
    grad.addColorStop(1, hexToRgba(element.fillColor, 0.08));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  } else if (element.fillStyle === 'hachure') {
    drawHachureFill(ctx, bounds, element.fillColor, element.strokeWidth, rng, pathFn);
  }
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (maxWidth > 20 && ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawCenteredShapeText(
  ctx: CanvasRenderingContext2D,
  element: BoardElement,
  bounds: Bounds
): void {
  if (!element.text) return;
  const fontSize = element.fontSize ?? 17;
  const lineHeight = fontSize * 1.28;
  ctx.save();
  ctx.font = `500 ${fontSize}px ${getFontStack(element.fontFamily ?? 'sans')}`;
  ctx.fillStyle =
    element.fillStyle === 'solid' ? getContrastInk(element.fillColor) : element.strokeColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const pad = Math.max(12, bounds.width * 0.12);
  const maxWidth = Math.max(40, bounds.width - pad * 2);
  const lines = wrapTextLines(ctx, element.text, maxWidth);
  const totalHeight = lines.length * lineHeight;
  const startY = bounds.y + bounds.height / 2 - totalHeight / 2 + lineHeight / 2;
  const cx = bounds.x + bounds.width / 2;

  lines.forEach((line, idx) => {
    ctx.fillText(line, cx, startY + idx * lineHeight);
  });
  ctx.restore();
}

function getContrastInk(hex: string): string {
  if (!hex || hex === 'transparent' || !hex.startsWith('#') || hex.length < 7) {
    return '#1d1d1f';
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1d1d1f' : '#f5f5f7';
}

function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  offsetX: number,
  offsetY: number
): void {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(offsetX + points[0].x, offsetY + points[0].y, ctx.lineWidth * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    return;
  }
  if (points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(offsetX + points[0].x, offsetY + points[0].y);
    ctx.lineTo(offsetX + points[1].x, offsetY + points[1].y);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(offsetX + points[0].x, offsetY + points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midX = offsetX + (p1.x + p2.x) / 2;
    const midY = offsetY + (p1.y + p2.y) / 2;
    ctx.quadraticCurveTo(offsetX + p1.x, offsetY + p1.y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(offsetX + last.x, offsetY + last.y);
  ctx.stroke();
}

function drawOrganicPenStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  offsetX: number,
  offsetY: number,
  baseWidth: number
): void {
  if (points.length <= 3) {
    drawSmoothStroke(ctx, points, offsetX, offsetY);
    return;
  }

  // Compute smoothed midpoint spline & dynamic velocity/taper widths (Excalidraw / Apple Pencil feel)
  const leftPts: Point[] = [];
  const rightPts: Point[] = [];
  const n = points.length;
  let prevRadius = baseWidth * 0.5;

  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const segDist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const speedFactor = Math.max(0.72, Math.min(1.18, 1.12 - segDist * 0.016));
    const taperStart = i < 3 ? 0.55 + (i / 3) * 0.45 : 1;
    const taperEnd = i > n - 4 ? 0.5 + ((n - 1 - i) / 3) * 0.5 : 1;
    const pressure = cur.pressure && cur.pressure !== 0.5 ? 0.6 + cur.pressure * 0.75 : 1;

    const targetRadius = Math.max(
      0.6,
      baseWidth * 0.54 * speedFactor * taperStart * taperEnd * pressure
    );
    const r = prevRadius * 0.55 + targetRadius * 0.45;
    prevRadius = r;

    leftPts.push({ x: offsetX + cur.x + nx * r, y: offsetY + cur.y + ny * r });
    rightPts.push({ x: offsetX + cur.x - nx * r, y: offsetY + cur.y - ny * r });
  }

  ctx.save();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(leftPts[0].x, leftPts[0].y);

  for (let i = 1; i < leftPts.length - 1; i++) {
    const p1 = leftPts[i];
    const p2 = leftPts[i + 1];
    ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }
  const lastL = leftPts[leftPts.length - 1];
  ctx.lineTo(lastL.x, lastL.y);

  // Round tip cap at end
  const tipEnd = points[n - 1];
  ctx.arc(
    offsetX + tipEnd.x,
    offsetY + tipEnd.y,
    Math.max(0.6, prevRadius),
    0,
    Math.PI * 2
  );

  for (let i = rightPts.length - 1; i > 0; i--) {
    const p1 = rightPts[i];
    const p0 = rightPts[i - 1];
    ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p0.x) / 2, (p1.y + p0.y) / 2);
  }
  ctx.closePath();
  ctx.fill();

  // Round start cap
  const tipStart = points[0];
  ctx.beginPath();
  ctx.arc(offsetX + tipStart.x, offsetY + tipStart.y, baseWidth * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number,
  sketchy: boolean,
  rng: () => number
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(10, strokeWidth * 4.5);
  const spread = Math.PI / 6.5;

  const ax = x2 - headLen * Math.cos(angle - spread);
  const ay = y2 - headLen * Math.sin(angle - spread);
  const bx = x2 - headLen * Math.cos(angle + spread);
  const by = y2 - headLen * Math.sin(angle + spread);

  if (sketchy) {
    sketchLine(ctx, x2, y2, ax, ay, rng, 0.9, false);
    sketchLine(ctx, x2, y2, bx, by, rng, 0.9, false);
  } else {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(x2, y2);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
}

export interface ConnectorGeometry {
  start: Point;
  end: Point;
  mid: Point;
  pathPoints: Point[];
  tangentFrom: Point;
}

export function getConnectorGeometry(el: BoardElement): ConnectorGeometry {
  const pts =
    el.points && el.points.length >= 2
      ? el.points
      : [
          { x: 0, y: 0 },
          { x: el.width, y: el.height },
        ];
  const p0 = { x: el.x + pts[0].x, y: el.y + pts[0].y };
  const p1 = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
  const route = el.routeType || 'straight';

  if (route === 'elbow') {
    const midX = el.controlPoint ? el.x + el.controlPoint.x : (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    const dx = Math.abs(p1.x - p0.x);
    const dy = Math.abs(p1.y - p0.y);

    let pathPoints: Point[];
    if (dx >= dy || el.controlPoint) {
      pathPoints = [p0, { x: midX, y: p0.y }, { x: midX, y: p1.y }, p1];
    } else {
      pathPoints = [p0, { x: p0.x, y: midY }, { x: p1.x, y: midY }, p1];
    }
    const tangentFrom = pathPoints[pathPoints.length - 2];
    const mid = {
      x: (pathPoints[1].x + pathPoints[2].x) / 2,
      y: (pathPoints[1].y + pathPoints[2].y) / 2,
    };
    return { start: p0, end: p1, mid, pathPoints, tangentFrom };
  }

  if (route === 'curved') {
    const ctrl = el.controlPoint
      ? { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y }
      : {
          x: (p0.x + p1.x) / 2,
          y: (p0.y + p1.y) / 2 - Math.min(60, Math.abs(p1.x - p0.x) * 0.28 + 20),
        };
    const mid = {
      x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p1.x,
      y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p1.y,
    };
    return {
      start: p0,
      end: p1,
      mid,
      pathPoints: [p0, ctrl, p1],
      tangentFrom: ctrl,
    };
  }

  // Straight (or bent via controlPoint)
  if (el.controlPoint) {
    const ctrl = { x: el.x + el.controlPoint.x, y: el.y + el.controlPoint.y };
    return {
      start: p0,
      end: p1,
      mid: ctrl,
      pathPoints: [p0, ctrl, p1],
      tangentFrom: ctrl,
    };
  }
  const worldPts = pts.map((pt) => ({ x: el.x + pt.x, y: el.y + pt.y }));
  return {
    start: p0,
    end: p1,
    mid: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 },
    pathPoints: worldPts,
    tangentFrom: worldPts[Math.max(0, worldPts.length - 2)],
  };
}

function drawConnectorLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  mid: Point,
  strokeColor: string
): void {
  if (!text.trim()) return;
  ctx.save();
  ctx.font = `600 12.5px ${getFontStack('sans')}`;
  const padX = 8;
  const w = Math.ceil(ctx.measureText(text).width + padX * 2);
  const h = 22;
  ctx.fillStyle = 'rgba(22, 24, 29, 0.92)';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.roundRect(mid.x - w / 2, mid.y - h / 2, w, h, 999);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f2f2f7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, mid.x, mid.y + 0.5);
  ctx.restore();
}

// Lightweight offline syntax highlighting for Apple Xcode Code Cards
const CODE_KEYWORDS = new Set([
  'def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'in',
  'as', 'with', 'try', 'except', 'async', 'await', 'function', 'const', 'let', 'var',
  'export', 'default', 'interface', 'type', 'struct', 'impl', 'fn', 'pub', 'int', 'float',
  'double', 'void', 'bool', 'true', 'false', 'True', 'False', 'None', 'null', 'undefined',
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP', 'BY', 'ORDER', 'END', 'end', 'zeros',
  'linspace', 'disp', 'include', 'using', 'namespace', 'std', 'new', 'break', 'continue',
]);

function tokenizeCodeLine(line: string, lang: string): Array<{ text: string; color: string }> {
  const tokens: Array<{ text: string; color: string }> = [];
  const commentPrefix = lang === 'python' || lang === 'bash' ? '#' : lang === 'matlab' ? '%' : lang === 'sql' ? '--' : '//';
  const commentIdx = line.indexOf(commentPrefix);

  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

  const tokenRx = /("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[()[\]{}.,:;+\-*/=<>!&|]+|\s+)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRx.exec(codePart)) !== null) {
    const val = m[0];
    if (/^\s+$/.test(val)) {
      tokens.push({ text: val, color: '#e5e7eb' });
    } else if (val.startsWith('"') || val.startsWith("'") || val.startsWith('`')) {
      tokens.push({ text: val, color: '#fc6a5d' });
    } else if (/^\d/.test(val)) {
      tokens.push({ text: val, color: '#d9c97c' });
    } else if (CODE_KEYWORDS.has(val)) {
      tokens.push({ text: val, color: '#ff7ab2' });
    } else if (/^[A-Z]/.test(val)) {
      tokens.push({ text: val, color: '#6bdfff' });
    } else {
      tokens.push({ text: val, color: '#e5e7eb' });
    }
  }

  if (commentPart) {
    tokens.push({ text: commentPart, color: '#7f8c98' });
  }
  return tokens;
}

function drawCodeCard(ctx: CanvasRenderingContext2D, element: BoardElement, bounds: Bounds): void {
  const { x, y, width: w, height: h } = bounds;
  const lang = (element.codeLanguage || 'python').toUpperCase();
  const fontSize = element.fontSize ?? 13.5;
  const lineH = fontSize * 1.48;
  const headerH = 30;
  const gutterW = 36;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = '#1c1e26';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.restore();

  // Header strip
  ctx.save();
  ctx.fillStyle = '#252834';
  ctx.beginPath();
  ctx.roundRect(x, y, w, headerH, [12, 12, 0, 0]);
  ctx.fill();

  // macOS window dots
  const dotColors = ['#ff5f57', '#febc2e', '#28c840'];
  dotColors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 14 + idx * 14, y + headerH / 2, 4.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Language badge
  ctx.font = `600 10.5px ${getFontStack('sans')}`;
  ctx.fillStyle = element.strokeColor || '#64d2ff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(lang, x + w - 12, y + headerH / 2);

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.stroke();

  // Clip code interior
  ctx.beginPath();
  ctx.roundRect(x, y + headerH, w, Math.max(10, h - headerH), [0, 0, 12, 12]);
  ctx.clip();

  const lines = (element.text || '// Type or paste code...').split('\n');
  ctx.font = `500 ${fontSize}px ${getFontStack('mono')}`;
  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    const ly = y + headerH + 8 + i * lineH;
    if (ly > y + h) break;

    // Line number
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), x + gutterW - 8, ly);

    // Syntax tokens
    ctx.textAlign = 'left';
    let curX = x + gutterW + 6;
    const tokens = tokenizeCodeLine(lines[i], element.codeLanguage || 'python');
    for (const tok of tokens) {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, curX, ly);
      curX += ctx.measureText(tok.text).width;
    }
  }
  ctx.restore();
}

function drawImageCard(ctx: CanvasRenderingContext2D, element: BoardElement, bounds: Bounds): void {
  const { x, y, width: w, height: h } = bounds;
  const radius = element.imageRadius ?? 12;
  const img = element.imageDataUrl ? getCachedImage(element.imageDataUrl) : null;

  ctx.save();
  if (element.imageShadow !== false) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  if (element.imageShadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  if (img) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);
    if (element.rotation) ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);

    if (element.imageFilter === 'invert') {
      ctx.filter = 'invert(1) hue-rotate(180deg)';
    } else if (element.imageFilter === 'grayscale') {
      ctx.filter = 'grayscale(1)';
    } else if (element.imageFilter === 'contrast') {
      ctx.filter = 'contrast(1.38) brightness(1.06)';
    }

    const crop = element.crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = crop.x * img.naturalWidth;
    const sy = crop.y * img.naturalHeight;
    const sw = Math.max(1, crop.w * img.naturalWidth);
    const sh = Math.max(1, crop.h * img.naturalHeight);
    ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 13px ${getFontStack('sans')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading image...', x + w / 2, y + h / 2);
  }
  ctx.restore();

  // Subtle frame border
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();

  if (element.text) {
    ctx.font = `500 12.5px ${getFontStack('sans')}`;
    ctx.fillStyle = element.strokeColor || '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(element.text, x + w / 2, y + h + 6);
  }
  ctx.restore();
}

export function normalizeRect(x: number, y: number, w: number, h: number): Bounds {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    width: Math.abs(w),
    height: Math.abs(h),
  };
}

export function getElementBounds(element: BoardElement): Bounds {
  if (
    (element.type === 'pen' ||
      element.type === 'highlighter' ||
      element.type === 'line' ||
      element.type === 'arrow') &&
    element.points &&
    element.points.length > 0
  ) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pt of element.points) {
      const wx = element.x + pt.x;
      const wy = element.y + pt.y;
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
    }
    if (element.controlPoint) {
      const cx = element.x + element.controlPoint.x;
      const cy = element.y + element.controlPoint.y;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(4, maxX - minX),
      height: Math.max(4, maxY - minY),
    };
  }
  return normalizeRect(element.x, element.y, element.width, element.height);
}

export function getShapePorts(el: BoardElement): Record<PortSide, Point> {
  const b = getElementBounds(el);
  return {
    n: { x: b.x + b.width / 2, y: b.y },
    e: { x: b.x + b.width, y: b.y + b.height / 2 },
    s: { x: b.x + b.width / 2, y: b.y + b.height },
    w: { x: b.x, y: b.y + b.height / 2 },
  };
}

export function isPortHost(el: BoardElement): boolean {
  return (
    el.type === 'rectangle' ||
    el.type === 'ellipse' ||
    el.type === 'diamond' ||
    el.type === 'sticky' ||
    el.type === 'code' ||
    el.type === 'image'
  );
}

export function findNearestPort(
  wx: number,
  wy: number,
  elements: BoardElement[],
  maxDist = 18,
  excludeId?: string
): { elementId: string; port: PortSide; point: Point } | null {
  let best: { elementId: string; port: PortSide; point: Point; dist: number } | null = null;
  for (const el of elements) {
    if (el.id === excludeId || !isPortHost(el)) continue;
    const ports = getShapePorts(el);
    for (const side of ['n', 'e', 's', 'w'] as PortSide[]) {
      const pt = ports[side];
      const d = Math.hypot(wx - pt.x, wy - pt.y);
      if (d <= maxDist && (!best || d < best.dist)) {
        best = { elementId: el.id, port: side, point: pt, dist: d };
      }
    }
  }
  return best ? { elementId: best.elementId, port: best.port, point: best.point } : null;
}

export function updateBoundConnectors(elements: BoardElement[]): BoardElement[] {
  const byId = new Map<string, BoardElement>();
  for (const el of elements) byId.set(el.id, el);

  return elements.map((el) => {
    if ((el.type !== 'line' && el.type !== 'arrow') || (!el.startBinding && !el.endBinding)) {
      return el;
    }
    const pts =
      el.points && el.points.length >= 2
        ? [...el.points]
        : [
            { x: 0, y: 0 },
            { x: el.width, y: el.height },
          ];
    let startW = { x: el.x + pts[0].x, y: el.y + pts[0].y };
    let endW = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };

    if (el.startBinding) {
      const host = byId.get(el.startBinding.elementId);
      if (host) startW = getShapePorts(host)[el.startBinding.port];
    }
    if (el.endBinding) {
      const host = byId.get(el.endBinding.elementId);
      if (host) endW = getShapePorts(host)[el.endBinding.port];
    }

    return {
      ...el,
      x: startW.x,
      y: startW.y,
      width: endW.x - startW.x,
      height: endW.y - startW.y,
      points: [
        { x: 0, y: 0 },
        { x: endW.x - startW.x, y: endW.y - startW.y },
      ],
    };
  });
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  element: BoardElement,
  options?: {
    isEraserHovered?: boolean;
    isEditingText?: boolean;
  }
): void {
  const rng = createRng(element.seed || 1337);
  const bounds = normalizeRect(element.x, element.y, element.width, element.height);
  const isSketchy = element.renderMode === 'sketchy';
  const hideText = Boolean(options?.isEditingText);

  ctx.save();
  ctx.globalAlpha = element.opacity * (options?.isEraserHovered ? 0.35 : 1);
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(getDashArray(element.strokeStyle, element.strokeWidth));

  if (element.type === 'pen' || element.type === 'highlighter') {
    const pts = element.points || [];
    if (element.type === 'highlighter') {
      ctx.globalAlpha *= 0.36;
      ctx.lineWidth = Math.max(10, element.strokeWidth * 4.5);
      ctx.setLineDash([]);
      drawSmoothStroke(ctx, pts, element.x, element.y);
    } else if (element.strokeStyle === 'solid') {
      drawOrganicPenStroke(ctx, pts, element.x, element.y, element.strokeWidth);
    } else {
      drawSmoothStroke(ctx, pts, element.x, element.y);
    }
    ctx.restore();
    return;
  }

  if (element.type === 'code') {
    drawCodeCard(ctx, element, bounds);
    ctx.restore();
    return;
  }

  if (element.type === 'image') {
    drawImageCard(ctx, element, bounds);
    ctx.restore();
    return;
  }

  if (element.type === 'rectangle') {
    const { x, y, width: w, height: h } = bounds;
    const radius =
      element.cornerRadius !== undefined
        ? Math.min(element.cornerRadius, w / 2, h / 2)
        : Math.min(12, w * 0.14, h * 0.14);
    const pathFn = () => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
    };
    applyFill(ctx, element, bounds, rng, pathFn);

    if (isSketchy && !element.cornerRadius) {
      sketchLine(ctx, x, y, x + w, y, rng, 1.3);
      sketchLine(ctx, x + w, y, x + w, y + h, rng, 1.3);
      sketchLine(ctx, x + w, y + h, x, y + h, rng, 1.3);
      sketchLine(ctx, x, y + h, x, y, rng, 1.3);
    } else {
      pathFn();
      ctx.stroke();
    }
    if (!hideText) {
      drawCenteredShapeText(ctx, element, bounds);
    }
    ctx.restore();
    return;
  }

  if (element.type === 'ellipse') {
    const { x, y, width: w, height: h } = bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = Math.max(1, w / 2);
    const ry = Math.max(1, h / 2);

    const pathFn = () => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    };
    applyFill(ctx, element, bounds, rng, pathFn);

    if (isSketchy) {
      const drawSketchyEllipsePass = (alphaMult: number, wobble: number) => {
        ctx.save();
        ctx.globalAlpha *= alphaMult;
        const steps = 28;
        ctx.beginPath();
        for (let i = 0; i <= steps + 1; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const drx = rx + (rng() - 0.5) * wobble;
          const dry = ry + (rng() - 0.5) * wobble;
          const px = cx + Math.cos(angle) * drx;
          const py = cy + Math.sin(angle) * dry;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      };
      drawSketchyEllipsePass(1, Math.min(3.5, Math.min(rx, ry) * 0.08));
      drawSketchyEllipsePass(0.58, Math.min(4.2, Math.min(rx, ry) * 0.1));
    } else {
      pathFn();
      ctx.stroke();
    }
    if (!hideText) {
      drawCenteredShapeText(ctx, element, bounds);
    }
    ctx.restore();
    return;
  }

  if (element.type === 'diamond') {
    const { x, y, width: w, height: h } = bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const pts = [
      { x: cx, y },
      { x: x + w, y: cy },
      { x: cx, y: y + h },
      { x, y: cy },
    ];
    const pathFn = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.closePath();
    };
    applyFill(ctx, element, bounds, rng, pathFn);

    if (isSketchy) {
      sketchLine(ctx, pts[0].x, pts[0].y, pts[1].x, pts[1].y, rng, 1.3);
      sketchLine(ctx, pts[1].x, pts[1].y, pts[2].x, pts[2].y, rng, 1.3);
      sketchLine(ctx, pts[2].x, pts[2].y, pts[3].x, pts[3].y, rng, 1.3);
      sketchLine(ctx, pts[3].x, pts[3].y, pts[0].x, pts[0].y, rng, 1.3);
    } else {
      pathFn();
      ctx.stroke();
    }
    if (!hideText) {
      drawCenteredShapeText(ctx, element, bounds);
    }
    ctx.restore();
    return;
  }

  if (element.type === 'line' || element.type === 'arrow') {
    const geom = getConnectorGeometry(element);
    const route = element.routeType || 'straight';

    if (route === 'curved') {
      const ctrl = geom.pathPoints[1];
      ctx.beginPath();
      ctx.moveTo(geom.start.x, geom.start.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, geom.end.x, geom.end.y);
      ctx.stroke();
    } else if (route === 'elbow') {
      const pts = geom.pathPoints;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 8);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    } else if (isSketchy && !element.controlPoint) {
      for (let i = 0; i < geom.pathPoints.length - 1; i++) {
        sketchLine(
          ctx,
          geom.pathPoints[i].x,
          geom.pathPoints[i].y,
          geom.pathPoints[i + 1].x,
          geom.pathPoints[i + 1].y,
          rng,
          1.2
        );
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(geom.pathPoints[0].x, geom.pathPoints[0].y);
      for (let i = 1; i < geom.pathPoints.length; i++) {
        ctx.lineTo(geom.pathPoints[i].x, geom.pathPoints[i].y);
      }
      ctx.stroke();
    }

    if (element.type === 'arrow') {
      drawArrowHead(
        ctx,
        geom.tangentFrom.x,
        geom.tangentFrom.y,
        geom.end.x,
        geom.end.y,
        element.strokeWidth,
        isSketchy && route === 'straight',
        rng
      );
    }

    if (element.text && !hideText) {
      drawConnectorLabel(ctx, element.text, geom.mid, element.strokeColor);
    }
    ctx.restore();
    return;
  }

  if (element.type === 'text') {
    if (hideText) {
      ctx.restore();
      return;
    }
    const fontSize = element.fontSize ?? 19;
    const lineHeight = fontSize * 1.3;
    const isTitle = element.semanticRole === 'title';
    ctx.font = `${isTitle ? '600' : '500'} ${fontSize}px ${getFontStack(element.fontFamily ?? 'sans')}`;
    ctx.fillStyle = element.strokeColor;
    ctx.textBaseline = 'top';
    const align = element.textAlign || 'left';
    ctx.textAlign = align;
    const drawX = align === 'center' ? element.x + bounds.width / 2 : element.x;

    const lines = (element.text || '').split('\n');
    lines.forEach((line, idx) => {
      ctx.fillText(line, drawX, element.y + idx * lineHeight);
    });
    ctx.restore();
    return;
  }

  if (element.type === 'sticky') {
    const { x, y, width: w, height: h } = bounds;
    const noteBg =
      !element.fillColor || element.fillColor === 'transparent' ? '#fef08a' : element.fillColor;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = noteBg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, Math.min(18, h * 0.16), [12, 12, 0, 0]);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.stroke();

    if (element.text && !hideText) {
      const fontSize = element.fontSize ?? 15.5;
      const lineHeight = fontSize * 1.32;
      ctx.font = `500 ${fontSize}px ${getFontStack(element.fontFamily ?? 'sans')}`;
      ctx.fillStyle = getContrastInk(noteBg);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const padX = 12;
      const padY = 22;
      const lines = wrapTextLines(ctx, element.text, Math.max(30, w - padX * 2));
      lines.forEach((line, idx) => {
        const ty = y + padY + idx * lineHeight;
        if (ty + fontSize <= y + h - 4) {
          ctx.fillText(line, x + padX, ty);
        }
      });
    }

    ctx.restore();
    return;
  }

  ctx.restore();
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTestElement(
  wx: number,
  wy: number,
  element: BoardElement,
  tolerance = 8
): boolean {
  if (element.type === 'line' || element.type === 'arrow') {
    const geom = getConnectorGeometry(element);
    const strokeTol = tolerance + element.strokeWidth * 0.5 + 3;
    if (element.text && Math.hypot(wx - geom.mid.x, wy - geom.mid.y) <= 26) {
      return true;
    }
    if (element.routeType === 'curved') {
      const ctrl = geom.pathPoints[1];
      let prev = geom.start;
      for (let t = 0.1; t <= 1.01; t += 0.1) {
        const u = 1 - t;
        const pt = {
          x: u * u * geom.start.x + 2 * u * t * ctrl.x + t * t * geom.end.x,
          y: u * u * geom.start.y + 2 * u * t * ctrl.y + t * t * geom.end.y,
        };
        if (distToSegment(wx, wy, prev.x, prev.y, pt.x, pt.y) <= strokeTol) return true;
        prev = pt;
      }
      return false;
    }
    for (let i = 0; i < geom.pathPoints.length - 1; i++) {
      const a = geom.pathPoints[i];
      const b = geom.pathPoints[i + 1];
      if (distToSegment(wx, wy, a.x, a.y, b.x, b.y) <= strokeTol) return true;
    }
    return false;
  }

  if (element.type === 'pen' || element.type === 'highlighter') {
    const pts = element.points || [];
    if (pts.length === 0) return false;
    const strokeTol =
      tolerance + (element.type === 'highlighter' ? element.strokeWidth * 2 : element.strokeWidth * 0.5);
    if (pts.length === 1) {
      return Math.hypot(wx - (element.x + pts[0].x), wy - (element.y + pts[0].y)) <= strokeTol;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(
        wx,
        wy,
        element.x + pts[i].x,
        element.y + pts[i].y,
        element.x + pts[i + 1].x,
        element.y + pts[i + 1].y
      );
      if (d <= strokeTol) return true;
    }
    return false;
  }

  const b = getElementBounds(element);
  if (
    wx < b.x - tolerance ||
    wx > b.x + b.width + tolerance ||
    wy < b.y - tolerance ||
    wy > b.y + b.height + tolerance
  ) {
    return false;
  }

  if (element.type === 'ellipse') {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const rx = Math.max(1, b.width / 2) + tolerance;
    const ry = Math.max(1, b.height / 2) + tolerance;
    const norm = ((wx - cx) * (wx - cx)) / (rx * rx) + ((wy - cy) * (wy - cy)) / (ry * ry);
    return norm <= 1.05;
  }

  if (element.type === 'diamond') {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const hw = Math.max(1, b.width / 2) + tolerance;
    const hh = Math.max(1, b.height / 2) + tolerance;
    return Math.abs(wx - cx) / hw + Math.abs(wy - cy) / hh <= 1.05;
  }

  return true;
}

export interface AlignmentGuide {
  axis: 'x' | 'y';
  pos: number;
  start: number;
  end: number;
}

export function computeAlignmentSnap(
  movingBounds: Bounds,
  elements: BoardElement[],
  excludedIds: Set<string>,
  threshold = 6
): { dx: number; dy: number; guides: AlignmentGuide[] } {
  let bestDx = 0;
  let bestDy = 0;
  let minAbsX = threshold + 0.01;
  let minAbsY = threshold + 0.01;
  const guides: AlignmentGuide[] = [];

  const mXPoints = [
    movingBounds.x,
    movingBounds.x + movingBounds.width / 2,
    movingBounds.x + movingBounds.width,
  ];
  const mYPoints = [
    movingBounds.y,
    movingBounds.y + movingBounds.height / 2,
    movingBounds.y + movingBounds.height,
  ];

  let matchedXGuide: AlignmentGuide | null = null;
  let matchedYGuide: AlignmentGuide | null = null;

  for (const el of elements) {
    if (excludedIds.has(el.id) || el.type === 'pen' || el.type === 'highlighter' || el.type === 'line' || el.type === 'arrow') {
      continue;
    }
    const b = getElementBounds(el);
    const tXPoints = [b.x, b.x + b.width / 2, b.x + b.width];
    const tYPoints = [b.y, b.y + b.height / 2, b.y + b.height];

    for (const mx of mXPoints) {
      for (const tx of tXPoints) {
        const diff = tx - mx;
        if (Math.abs(diff) < minAbsX) {
          minAbsX = Math.abs(diff);
          bestDx = diff;
          matchedXGuide = {
            axis: 'x',
            pos: tx,
            start: Math.min(movingBounds.y, b.y) - 16,
            end: Math.max(movingBounds.y + movingBounds.height, b.y + b.height) + 16,
          };
        }
      }
    }

    for (const my of mYPoints) {
      for (const ty of tYPoints) {
        const diff = ty - my;
        if (Math.abs(diff) < minAbsY) {
          minAbsY = Math.abs(diff);
          bestDy = diff;
          matchedYGuide = {
            axis: 'y',
            pos: ty,
            start: Math.min(movingBounds.x, b.x) - 16,
            end: Math.max(movingBounds.x + movingBounds.width, b.x + b.width) + 16,
          };
        }
      }
    }
  }

  if (matchedXGuide) guides.push(matchedXGuide);
  if (matchedYGuide) guides.push(matchedYGuide);

  return { dx: bestDx, dy: bestDy, guides };
}

export function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  zoom: number
): void {
  if (guides.length === 0) return;
  ctx.save();
  ctx.strokeStyle = '#FF9F0A';
  ctx.lineWidth = 1.1 / zoom;
  ctx.setLineDash([4 / zoom, 3 / zoom]);
  for (const g of guides) {
    ctx.beginPath();
    if (g.axis === 'x') {
      ctx.moveTo(g.pos, g.start);
      ctx.lineTo(g.pos, g.end);
    } else {
      ctx.moveTo(g.start, g.pos);
      ctx.lineTo(g.end, g.pos);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function getSelectionBounds(elements: BoardElement[]): Bounds | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getHandlePositions(bounds: Bounds): Record<ResizeHandle, Point> {
  const { x, y, width: w, height: h } = bounds;
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  };
}

export function getResizeHandleAt(
  wx: number,
  wy: number,
  bounds: Bounds,
  zoom: number
): ResizeHandle | null {
  const threshold = 9 / zoom;
  const handles = getHandlePositions(bounds);
  const order: ResizeHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'];
  for (const key of order) {
    const pt = handles[key];
    if (Math.hypot(wx - pt.x, wy - pt.y) <= threshold) {
      return key;
    }
  }
  return null;
}

export function scaleElement(
  element: BoardElement,
  oldBounds: Bounds,
  newBounds: Bounds
): BoardElement {
  const oldW = Math.max(1, oldBounds.width);
  const oldH = Math.max(1, oldBounds.height);
  const scaleX = newBounds.width / oldW;
  const scaleY = newBounds.height / oldH;

  if (
    (element.type === 'pen' ||
      element.type === 'highlighter' ||
      element.type === 'line' ||
      element.type === 'arrow') &&
    element.points &&
    element.points.length > 0
  ) {
    const newPoints = element.points.map((pt) => {
      const wx = element.x + pt.x;
      const wy = element.y + pt.y;
      const nx = newBounds.x + (wx - oldBounds.x) * scaleX;
      const ny = newBounds.y + (wy - oldBounds.y) * scaleY;
      return {
        x: nx - newBounds.x,
        y: ny - newBounds.y,
        pressure: pt.pressure,
      };
    });
    return {
      ...element,
      x: newBounds.x,
      y: newBounds.y,
      width: newBounds.width,
      height: newBounds.height,
      points: newPoints,
    };
  }

  const elBounds = getElementBounds(element);
  const nx = newBounds.x + (elBounds.x - oldBounds.x) * scaleX;
  const ny = newBounds.y + (elBounds.y - oldBounds.y) * scaleY;
  const nw = Math.max(8, elBounds.width * scaleX);
  const nh = Math.max(8, elBounds.height * scaleY);

  let nextFontSize = element.fontSize;
  if (element.type === 'text' && element.fontSize) {
    const avgScale = (scaleX + scaleY) / 2;
    nextFontSize = Math.max(8, Math.min(180, Math.round(element.fontSize * avgScale)));
  }

  return {
    ...element,
    x: nx,
    y: ny,
    width: nw,
    height: nh,
    fontSize: nextFontSize,
  };
}

export function measureTextBlock(
  text: string,
  fontSize: number,
  fontFamily: FontFamily
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 120, height: fontSize * 1.4 };
  ctx.font = `500 ${fontSize}px ${getFontStack(fontFamily)}`;
  const lines = (text || ' ').split('\n');
  let maxW = 24;
  for (const line of lines) {
    maxW = Math.max(maxW, ctx.measureText(line || ' ').width);
  }
  return {
    width: Math.ceil(maxW + 10),
    height: Math.ceil(lines.length * fontSize * 1.32 + 4),
  };
}

export function exportPageToPNG(elements: BoardElement[], theme: ThemeType, title: string): void {
  const themeCfg = resolveThemeConfig(theme);
  const bounds = getSelectionBounds(elements) ?? { x: -200, y: -150, width: 400, height: 300 };
  const pad = 48;
  const exportW = Math.max(320, Math.ceil(bounds.width + pad * 2));
  const exportH = Math.max(240, Math.ceil(bounds.height + pad * 2));
  const dpr = 2;

  const canvas = document.createElement('canvas');
  canvas.width = exportW * dpr;
  canvas.height = exportH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.fillStyle = themeCfg.bg;
  ctx.fillRect(0, 0, exportW, exportH);

  ctx.translate(-bounds.x + pad, -bounds.y + pad);
  for (const el of elements) {
    drawElement(ctx, el);
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'board'}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function elementToSvgString(el: BoardElement): string {
  const b = getElementBounds(el);
  const dashAttr =
    el.strokeStyle === 'dashed'
      ? `stroke-dasharray="${Math.max(8, el.strokeWidth * 3.5)} ${Math.max(6, el.strokeWidth * 2.5)}"`
      : el.strokeStyle === 'dotted'
        ? `stroke-dasharray="${Math.max(1.5, el.strokeWidth * 0.8)} ${Math.max(5, el.strokeWidth * 2.4)}"`
        : '';

  const fillAttr =
    !el.fillColor || el.fillColor === 'transparent' || el.fillStyle === 'none'
      ? 'fill="none"'
      : el.fillStyle === 'solid'
        ? `fill="${el.fillColor}"`
        : `fill="${el.fillColor}" fill-opacity="0.22"`;

  if (el.type === 'pen' || el.type === 'highlighter') {
    const pts = el.points || [];
    if (pts.length === 0) return '';
    const d = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(el.x + p.x).toFixed(2)} ${(el.y + p.y).toFixed(2)}`)
      .join(' ');
    const sw = el.type === 'highlighter' ? Math.max(10, el.strokeWidth * 4.5) : el.strokeWidth;
    const op = el.type === 'highlighter' ? el.opacity * 0.36 : el.opacity;
    return `<path d="${d}" fill="none" stroke="${el.strokeColor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" />`;
  }

  if (el.type === 'image' && el.imageDataUrl) {
    return `<image href="${el.imageDataUrl}" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" preserveAspectRatio="none" />`;
  }

  if (el.type === 'code') {
    const fs = el.fontSize ?? 13.5;
    const lines = (el.text || '').split('\n');
    const tspans = lines
      .map(
        (line, i) =>
          `<text x="${b.x + 14}" y="${b.y + 42 + i * fs * 1.48}" fill="#e5e7eb" font-size="${fs}" font-family="${escapeXml(getFontStack('mono'))}">${escapeXml(line)}</text>`
      )
      .join('');
    return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="12" fill="#1c1e26" stroke="rgba(255,255,255,0.2)" />${tspans}`;
  }

  if (el.type === 'rectangle') {
    const r = el.cornerRadius ?? Math.min(12, b.width * 0.14, b.height * 0.14);
    const rect = `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${r}" ${fillAttr} stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" ${dashAttr} opacity="${el.opacity}" />`;
    if (!el.text) return rect;
    const fs = el.fontSize ?? 17;
    const lines = el.text.split('\n');
    const startY = b.y + b.height / 2 - ((lines.length - 1) * fs * 1.25) / 2;
    const tspans = lines
      .map(
        (line, i) =>
          `<text x="${b.x + b.width / 2}" y="${startY + i * fs * 1.25}" fill="${el.strokeColor}" font-size="${fs}" font-family="${escapeXml(getFontStack(el.fontFamily ?? 'sans'))}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`
      )
      .join('');
    return `${rect}${tspans}`;
  }

  if (el.type === 'ellipse') {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const ellipse = `<ellipse cx="${cx}" cy="${cy}" rx="${b.width / 2}" ry="${b.height / 2}" ${fillAttr} stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" ${dashAttr} opacity="${el.opacity}" />`;
    if (!el.text) return ellipse;
    const fs = el.fontSize ?? 17;
    return `${ellipse}<text x="${cx}" y="${cy}" fill="${el.strokeColor}" font-size="${fs}" font-family="${escapeXml(getFontStack(el.fontFamily ?? 'sans'))}" text-anchor="middle" dominant-baseline="middle">${escapeXml(el.text)}</text>`;
  }

  if (el.type === 'diamond') {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const pts = `${cx},${b.y} ${b.x + b.width},${cy} ${cx},${b.y + b.height} ${b.x},${cy}`;
    const poly = `<polygon points="${pts}" ${fillAttr} stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" ${dashAttr} opacity="${el.opacity}" />`;
    if (!el.text) return poly;
    const fs = el.fontSize ?? 17;
    return `${poly}<text x="${cx}" y="${cy}" fill="${el.strokeColor}" font-size="${fs}" font-family="${escapeXml(getFontStack(el.fontFamily ?? 'sans'))}" text-anchor="middle" dominant-baseline="middle">${escapeXml(el.text)}</text>`;
  }

  if (el.type === 'line' || el.type === 'arrow') {
    const geom = getConnectorGeometry(el);
    let d: string;
    if (el.routeType === 'curved') {
      d = `M ${geom.start.x.toFixed(2)} ${geom.start.y.toFixed(2)} Q ${geom.pathPoints[1].x.toFixed(2)} ${geom.pathPoints[1].y.toFixed(2)} ${geom.end.x.toFixed(2)} ${geom.end.y.toFixed(2)}`;
    } else {
      d = geom.pathPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');
    }
    let arrowHead = '';
    if (el.type === 'arrow') {
      const angle = Math.atan2(geom.end.y - geom.tangentFrom.y, geom.end.x - geom.tangentFrom.x);
      const len = Math.max(10, el.strokeWidth * 4.5);
      const spread = Math.PI / 6.5;
      const ax = geom.end.x - len * Math.cos(angle - spread);
      const ay = geom.end.y - len * Math.sin(angle - spread);
      const bx = geom.end.x - len * Math.cos(angle + spread);
      const by = geom.end.y - len * Math.sin(angle + spread);
      arrowHead = `<path d="M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${geom.end.x.toFixed(2)} ${geom.end.y.toFixed(2)} L ${bx.toFixed(2)} ${by.toFixed(2)}" fill="none" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
    }
    return `<path d="${d}" fill="none" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linecap="round" ${dashAttr} opacity="${el.opacity}" />${arrowHead}`;
  }

  if (el.type === 'text') {
    const fs = el.fontSize ?? 19;
    const lines = (el.text || '').split('\n');
    return lines
      .map(
        (line, i) =>
          `<text x="${el.x}" y="${el.y + fs + i * fs * 1.3}" fill="${el.strokeColor}" font-size="${fs}" font-family="${escapeXml(getFontStack(el.fontFamily ?? 'sans'))}" opacity="${el.opacity}">${escapeXml(line)}</text>`
      )
      .join('');
  }

  if (el.type === 'sticky') {
    const bg = !el.fillColor || el.fillColor === 'transparent' ? '#fef08a' : el.fillColor;
    const ink = getContrastInk(bg);
    const fs = el.fontSize ?? 15.5;
    const lines = (el.text || '').split('\n');
    const txt = lines
      .map(
        (line, i) =>
          `<text x="${b.x + 12}" y="${b.y + 24 + fs + i * fs * 1.3}" fill="${ink}" font-size="${fs}" font-family="${escapeXml(getFontStack(el.fontFamily ?? 'sans'))}">${escapeXml(line)}</text>`
      )
      .join('');
    return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="12" fill="${bg}" stroke="rgba(0,0,0,0.18)" stroke-width="1" />${txt}`;
  }

  return '';
}

export function exportPageToSVG(elements: BoardElement[], theme: ThemeType, title: string): void {
  const themeCfg = resolveThemeConfig(theme);
  const bounds = getSelectionBounds(elements) ?? { x: -200, y: -150, width: 400, height: 300 };
  const pad = 40;
  const exportW = Math.max(320, Math.ceil(bounds.width + pad * 2));
  const exportH = Math.max(240, Math.ceil(bounds.height + pad * 2));
  const vx = bounds.x - pad;
  const vy = bounds.y - pad;

  const body = elements.map(elementToSvgString).filter(Boolean).join('\n  ');
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${exportW}" height="${exportH}" viewBox="${vx} ${vy} ${exportW} ${exportH}">`,
    `  <rect x="${vx}" y="${vy}" width="${exportW}" height="${exportH}" fill="${themeCfg.bg}" />`,
    `  ${body}`,
    `</svg>`,
  ].join('\n');

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'board'}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
