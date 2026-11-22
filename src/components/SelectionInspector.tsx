import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  ArrowLeftRight,
  Circle,
  Copy,
  Crop,
  Diamond,
  Edit3,
  FlipHorizontal2,
  FlipVertical2,
  Layers,
  RectangleHorizontal,
  RotateCw,
  Spline,
  Square,
  StickyNote,
  Trash2,
  Type,
} from 'lucide-react';
import {
  BoardElement,
  Camera,
  FillStyle,
  FontFamily,
  ImageFilter,
  PaletteId,
  RouteType,
} from '../types/board';
import { resolvePalette } from '../utils/smartTheme';
import { getElementBounds, worldToScreen } from '../utils/renderer';

export type MorphTarget = 'text' | 'rectangle' | 'pill' | 'diamond' | 'ellipse' | 'sticky';

interface SelectionInspectorProps {
  element: BoardElement;
  camera: Camera;
  viewportSize: { width: number; height: number };
  isDarkTheme: boolean;
  paletteId: PaletteId;
  isCropping: boolean;
  onEditElement: (el: BoardElement) => void;
  onUpdateElement: (patch: Partial<BoardElement>) => void;
  onApplyColor: (hex: string) => void;
  onMorphElement: (target: MorphTarget) => void;
  onSwapConnector: () => void;
  onSpawnBranch: (dir: 'up' | 'right' | 'down' | 'left') => void;
  onBringToFront: () => void;
  onToggleCrop: () => void;
  onCopyCode: (text: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const CODE_LANGUAGES = [
  'python',
  'typescript',
  'javascript',
  'cpp',
  'matlab',
  'sql',
  'bash',
  'rust',
  'json',
  'latex',
];

export const SelectionInspector: React.FC<SelectionInspectorProps> = ({
  element,
  camera,
  viewportSize,
  isDarkTheme,
  paletteId,
  isCropping,
  onEditElement,
  onUpdateElement,
  onApplyColor,
  onMorphElement,
  onSwapConnector,
  onSpawnBranch,
  onBringToFront,
  onToggleCrop,
  onCopyCode,
  onDuplicate,
  onDelete,
}) => {
  const b = getElementBounds(element);
  const topCenter = worldToScreen(b.x + b.width / 2, b.y, camera);
  const bottomCenter = worldToScreen(b.x + b.width / 2, b.y + b.height, camera);
  const palette = resolvePalette(paletteId);

  // Position cleanly above the element, or below if near top bar, using translate-x-[-50%] for true centering
  const clampedCenterX = Math.max(210, Math.min(viewportSize.width - 210, topCenter.x));
  const rawTop = topCenter.y - 54;
  const safeTop =
    rawTop < 62
      ? Math.min(viewportSize.height - 96, bottomCenter.y + 24)
      : rawTop;

  const isMorphable =
    element.type === 'rectangle' ||
    element.type === 'ellipse' ||
    element.type === 'diamond' ||
    element.type === 'text' ||
    element.type === 'sticky';
  const isShape =
    element.type === 'rectangle' || element.type === 'ellipse' || element.type === 'diamond';
  const isConnector = element.type === 'line' || element.type === 'arrow';
  const hasTypography =
    isMorphable || isConnector;

  const surfaceClass = isDarkTheme
    ? 'lavish-glass-dark text-[#f5f5f7]'
    : 'lavish-glass-light text-[#1d1d1f]';

  const btnClass = isDarkTheme
    ? 'hover:bg-white/12 text-slate-200 hover:text-white'
    : 'hover:bg-black/8 text-slate-700 hover:text-slate-950';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        left: `${clampedCenterX}px`,
        top: `${safeTop}px`,
        transform: 'translateX(-50%)',
        maxWidth: `${Math.max(260, viewportSize.width - 16)}px`,
      }}
      className={`fixed z-30 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] overflow-x-auto no-scrollbar transition-all ${surfaceClass}`}
    >
      {/* 1. Direct Harmonic Color Swatches on Selection Inspector */}
      {element.type !== 'image' && (
        <>
          <div className="flex items-center gap-1 pr-0.5 shrink-0" title="Click to apply color (or press Tab)">
            {palette.nodeCycle.slice(0, 5).map((col) => {
              const active = element.strokeColor.toLowerCase() === col.toLowerCase();
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => onApplyColor(col)}
                  style={{ backgroundColor: col }}
                  className={`rounded-sm transition ${
                    active
                      ? 'w-3.5 h-3.5 ring-1 ring-offset-1 ring-[#007AFF]'
                      : 'w-2.5 h-2.5 opacity-75 hover:opacity-100'
                  }`}
                />
              );
            })}
          </div>
          <div className="h-3.5 w-px bg-current opacity-15 shrink-0" />
        </>
      )}

      {/* 2. 1-Click Morph Between Text / Box / Pill / Diamond / Circle / Sticky */}
      {isMorphable && (
        <>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onMorphElement('text')}
              title="Convert to Plain Text"
              className={`p-1 rounded-lg transition ${
                element.type === 'text' ? 'lavish-active-tool text-white' : btnClass
              }`}
            >
              <Type size={12} />
            </button>
            <button
              type="button"
              onClick={() => onMorphElement('rectangle')}
              title="Convert to Rectangle"
              className={`p-1 rounded-lg transition ${
                element.type === 'rectangle' && (element.cornerRadius ?? 0) <= 20
                  ? 'lavish-active-tool text-white'
                  : btnClass
              }`}
            >
              <Square size={12} />
            </button>
            <button
              type="button"
              onClick={() => onMorphElement('pill')}
              title="Convert to Rounded Pill"
              className={`p-1 rounded-lg transition ${
                element.type === 'rectangle' && (element.cornerRadius ?? 0) > 20
                  ? 'lavish-active-tool text-white'
                  : btnClass
              }`}
            >
              <RectangleHorizontal size={12} />
            </button>
            <button
              type="button"
              onClick={() => onMorphElement('diamond')}
              title="Convert to Decision Diamond"
              className={`p-1 rounded-lg transition ${
                element.type === 'diamond' ? 'lavish-active-tool text-white' : btnClass
              }`}
            >
              <Diamond size={12} />
            </button>
            <button
              type="button"
              onClick={() => onMorphElement('ellipse')}
              title="Convert to Circle / Ellipse"
              className={`p-1 rounded-lg transition ${
                element.type === 'ellipse' ? 'lavish-active-tool text-white' : btnClass
              }`}
            >
              <Circle size={12} />
            </button>
            <button
              type="button"
              onClick={() => onMorphElement('sticky')}
              title="Convert to Sticky Note"
              className={`p-1 rounded-lg transition ${
                element.type === 'sticky' ? 'lavish-active-tool text-white' : btnClass
              }`}
            >
              <StickyNote size={12} />
            </button>
          </div>

          <div className="h-3.5 w-px bg-current opacity-15 shrink-0" />
        </>
      )}

      {/* 3. Surface Finish Pills for Shapes (Glass / Solid / Outline) */}
      {isShape && (
        <>
          <div className="flex items-center gap-0.5 shrink-0">
            {(
              [
                { id: 'semi', label: 'Glass' },
                { id: 'solid', label: 'Solid' },
                { id: 'none', label: 'Line' },
              ] as Array<{ id: FillStyle; label: string }>
            ).map((fs) => (
              <button
                key={fs.id}
                type="button"
                onClick={() =>
                  onUpdateElement({
                    fillStyle: fs.id,
                    fillColor:
                      fs.id !== 'none' &&
                      (!element.fillColor || element.fillColor === 'transparent')
                        ? element.strokeColor
                        : element.fillColor,
                  })
                }
                className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium transition ${
                  element.fillStyle === fs.id
                    ? 'lavish-active-tool text-white font-semibold'
                    : btnClass
                }`}
              >
                {fs.label}
              </button>
            ))}
          </div>
          <div className="h-3.5 w-px bg-current opacity-15 shrink-0" />
        </>
      )}

      {/* 4. Interactive Apple Font & Size Controls directly on Selected Item */}
      {hasTypography && (
        <>
          <button
            type="button"
            onClick={() => {
              const order: FontFamily[] = ['sans', 'rounded', 'serif', 'mono'];
              const cur = element.fontFamily === 'hand' ? 'rounded' : element.fontFamily || 'sans';
              const next = order[(order.indexOf(cur) + 1) % order.length];
              onUpdateElement({ fontFamily: next });
            }}
            title="Cycle Apple Font (SF Pro / Rounded / New York / SF Mono)"
            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition ${btnClass}`}
          >
            {element.fontFamily === 'mono'
              ? 'SF Mono'
              : element.fontFamily === 'serif'
                ? 'New York'
                : element.fontFamily === 'rounded' || element.fontFamily === 'hand'
                  ? 'Rounded'
                  : 'SF Pro'}
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            {(() => {
              const curSize = element.fontSize ?? 18;
              const activeLabel = curSize <= 15.5 ? 'S' : curSize <= 21 ? 'M' : 'L';
              return [
                { label: 'S', size: 14 },
                { label: 'M', size: 18 },
                { label: 'L', size: 24 },
              ].map((sz) => (
                <button
                  key={sz.label}
                  type="button"
                  onClick={() => onUpdateElement({ fontSize: sz.size })}
                  className={`w-5 h-5 rounded-lg text-[10px] font-semibold flex items-center justify-center transition ${
                    activeLabel === sz.label
                      ? 'lavish-active-tool text-white'
                      : btnClass
                  }`}
                >
                  {sz.label}
                </button>
              ));
            })()}
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateElement({
                textAlign: (element.textAlign || 'center') === 'center' ? 'left' : 'center',
              })
            }
            title="Toggle Text Alignment"
            className={`p-1 rounded-lg shrink-0 transition ${btnClass}`}
          >
            {(element.textAlign || 'center') === 'center' ? (
              <AlignCenter size={12} />
            ) : (
              <AlignLeft size={12} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onEditElement(element)}
            title="Edit Text & Math (Enter)"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg lavish-active-tool text-white font-semibold shrink-0 transition"
          >
            <Edit3 size={11} />
            <span>Edit</span>
          </button>

          {isShape && (
            <>
              <button
                type="button"
                onClick={() => onSpawnBranch('right')}
                title="Add Connected Node Right"
                className={`px-1.5 py-0.5 rounded-lg font-semibold shrink-0 transition ${btnClass}`}
              >
                +→
              </button>
              <button
                type="button"
                onClick={() => onSpawnBranch('down')}
                title="Add Connected Node Down"
                className={`px-1.5 py-0.5 rounded-lg font-semibold shrink-0 transition ${btnClass}`}
              >
                +↓
              </button>
            </>
          )}
        </>
      )}

      {/* 5. Visio Connector Inspector */}
      {isConnector && (
        <>
          <div className="h-3.5 w-px bg-current opacity-15 shrink-0" />
          {(
            [
              { id: 'straight', label: 'Straight' },
              { id: 'elbow', label: 'Elbow 90°' },
              { id: 'curved', label: 'Curved' },
            ] as Array<{ id: RouteType; label: string }>
          ).map((rt) => (
            <button
              key={rt.id}
              type="button"
              onClick={() => onUpdateElement({ routeType: rt.id })}
              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium shrink-0 transition ${
                (element.routeType || 'straight') === rt.id
                  ? 'lavish-active-tool text-white font-semibold'
                  : btnClass
              }`}
            >
              {rt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onSwapConnector}
            title="Reverse Connector Direction"
            className={`p-1 rounded-lg shrink-0 ${btnClass}`}
          >
            <ArrowLeftRight size={12} />
          </button>
        </>
      )}

      {/* 6. Multi-Tool Image Studio Inspector */}
      {element.type === 'image' && (
        <>
          {(
            [
              { id: 'none', label: 'Original' },
              { id: 'invert', label: 'Invert' },
              { id: 'grayscale', label: 'B&W' },
              { id: 'contrast', label: 'Pop' },
            ] as Array<{ id: ImageFilter; label: string }>
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onUpdateElement({ imageFilter: f.id })}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium shrink-0 transition ${
                (element.imageFilter || 'none') === f.id
                  ? 'lavish-active-tool text-white font-semibold'
                  : btnClass
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="h-3.5 w-px bg-current opacity-15 shrink-0" />
          <button
            type="button"
            onClick={() => {
              const radii = [0, 14, 28];
              const cur = element.imageRadius ?? 12;
              const next = radii[(radii.findIndex((r) => Math.abs(r - cur) <= 4) + 1) % radii.length];
              onUpdateElement({ imageRadius: next });
            }}
            title="Cycle Corner Radius"
            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono shrink-0 ${btnClass}`}
          >
            R{element.imageRadius ?? 12}
          </button>
          <button
            type="button"
            onClick={() => onUpdateElement({ rotation: ((element.rotation || 0) + 90) % 360 })}
            title="Rotate 90°"
            className={`p-1 rounded-lg shrink-0 ${btnClass}`}
          >
            <RotateCw size={12} />
          </button>
          <button
            type="button"
            onClick={() => onUpdateElement({ flipX: !element.flipX })}
            title="Flip Horizontal"
            className={`p-1 rounded-lg shrink-0 ${
              element.flipX ? 'lavish-active-tool text-white' : btnClass
            }`}
          >
            <FlipHorizontal2 size={12} />
          </button>
          <button
            type="button"
            onClick={() => onUpdateElement({ flipY: !element.flipY })}
            title="Flip Vertical"
            className={`p-1 rounded-lg shrink-0 ${
              element.flipY ? 'lavish-active-tool text-white' : btnClass
            }`}
          >
            <FlipVertical2 size={12} />
          </button>
          <button
            type="button"
            onClick={onToggleCrop}
            title="Toggle Crop Mode"
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg shrink-0 transition ${
              isCropping ? 'bg-amber-400 text-slate-950 font-semibold' : btnClass
            }`}
          >
            <Crop size={11} />
            <span>Crop</span>
          </button>
          <button
            type="button"
            onClick={() => onEditElement(element)}
            title="Edit Image Caption"
            className={`px-1.5 py-0.5 rounded-lg shrink-0 ${btnClass}`}
          >
            Caption
          </button>
        </>
      )}

      {/* 7. Code Card Inspector */}
      {element.type === 'code' && (
        <>
          <select
            value={element.codeLanguage || 'python'}
            onChange={(e) => onUpdateElement({ codeLanguage: e.target.value })}
            aria-label="Code Language"
            className="bg-black/30 border border-white/15 rounded-lg px-2 py-0.5 text-[10px] text-sky-300 outline-none shrink-0"
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l} value={l} className="bg-slate-900 text-slate-100">
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onEditElement(element)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg lavish-active-tool text-white font-semibold shrink-0"
          >
            <Edit3 size={11} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onCopyCode(element.text || '')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium shrink-0 ${btnClass}`}
          >
            <Copy size={11} />
            <span>Copy</span>
          </button>
        </>
      )}

      {/* Common Layer, Duplicate & Delete Actions */}
      <div className="h-3.5 w-px bg-current opacity-15 shrink-0" />
      <button
        type="button"
        onClick={onBringToFront}
        title="Bring to Front"
        className={`p-1 rounded-lg shrink-0 ${btnClass}`}
      >
        <Layers size={11.5} />
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate (Ctrl+D)"
        className={`p-1 rounded-lg shrink-0 ${btnClass}`}
      >
        <Copy size={11.5} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete (Del)"
        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 shrink-0"
      >
        <Trash2 size={11.5} />
      </button>
    </div>
  );
};
