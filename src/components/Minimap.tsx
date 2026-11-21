import React, { useEffect, useRef } from 'react';
import { BoardElement, Camera, ThemeType, resolveThemeConfig } from '../types/board';
import { drawElement, getSelectionBounds } from '../utils/renderer';

interface MinimapProps {
  elements: BoardElement[];
  camera: Camera;
  theme: ThemeType;
  viewportSize: { width: number; height: number };
  onNavigate: (camera: Camera) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  elements,
  camera,
  theme,
  viewportSize,
  onNavigate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const mapParamsRef = useRef({ minX: 0, minY: 0, scale: 1 });

  const MAP_W = 148;
  const MAP_H = 96;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const themeCfg = resolveThemeConfig(theme);
    ctx.fillStyle = themeCfg.bg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Current viewport bounds in world coords
    const vw = viewportSize.width / camera.zoom;
    const vh = viewportSize.height / camera.zoom;
    const vx = -camera.x / camera.zoom;
    const vy = -camera.y / camera.zoom;

    const elBounds = getSelectionBounds(elements);
    let minX = vx;
    let minY = vy;
    let maxX = vx + vw;
    let maxY = vy + vh;

    if (elBounds) {
      minX = Math.min(minX, elBounds.x);
      minY = Math.min(minY, elBounds.y);
      maxX = Math.max(maxX, elBounds.x + elBounds.width);
      maxY = Math.max(maxY, elBounds.y + elBounds.height);
    }

    const pad = 120;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const worldW = Math.max(100, maxX - minX);
    const worldH = Math.max(100, maxY - minY);
    const scale = Math.min((MAP_W - 10) / worldW, (MAP_H - 10) / worldH);

    const offsetX = (MAP_W - worldW * scale) / 2;
    const offsetY = (MAP_H - worldH * scale) / 2;

    mapParamsRef.current = {
      minX: minX - offsetX / scale,
      minY: minY - offsetY / scale,
      scale,
    };

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);

    for (const el of elements) {
      drawElement(ctx, el);
    }

    // Current viewport indicator box
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = Math.max(1 / scale, 1.2 / scale);
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeRect(vx, vy, vw, vh);

    ctx.restore();
  }, [elements, camera, theme, viewportSize]);

  const jumpToClientPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const { minX, minY, scale } = mapParamsRef.current;

    const worldX = minX + mx / scale;
    const worldY = minY + my / scale;

    onNavigate({
      x: viewportSize.width / 2 - worldX * camera.zoom,
      y: viewportSize.height / 2 - worldY * camera.zoom,
      zoom: camera.zoom,
    });
  };

  return (
    <div
      className="rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950/90 backdrop-blur-md p-1"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-1.5 pb-1 text-[10px] font-medium text-slate-400">
        <span>Minimap</span>
        <span className="text-sky-400 font-mono">{elements.length} obj</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: MAP_W, height: MAP_H }}
        className="rounded-lg cursor-crosshair block border border-slate-800/80"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingRef.current = true;
          jumpToClientPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          jumpToClientPoint(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
      />
    </div>
  );
};
