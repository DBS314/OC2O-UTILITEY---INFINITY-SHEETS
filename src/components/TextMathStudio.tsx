import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  Check,
  Code2,
  FunctionSquare,
  Heading1,
  Type,
} from 'lucide-react';
import { FontFamily } from '../types/board';
import { formatMathShortcuts, toSubscript, toSuperscript } from '../utils/storage';
import { getFontStack } from '../utils/renderer';

export interface StudioCommitPayload {
  text: string;
  mode: 'text' | 'title' | 'math' | 'code' | 'shape' | 'sticky' | 'connector';
  fontFamily: FontFamily;
  fontSize: number;
  textAlign: 'left' | 'center';
  codeLanguage: string;
}

interface TextMathStudioProps {
  initialValue: string;
  initialMode: 'text' | 'title' | 'math' | 'code' | 'shape' | 'sticky' | 'connector';
  initialFontFamily: FontFamily;
  initialFontSize: number;
  initialTextAlign: 'left' | 'center';
  initialCodeLanguage?: string;
  screenX: number;
  screenY: number;
  boxWidth?: number;
  boxHeight?: number;
  zoom: number;
  isDarkTheme: boolean;
  viewportSize: { width: number; height: number };
  accentColor: string;
  onCommit: (payload: StudioCommitPayload) => void;
  onCancel: () => void;
}

const GREEK_SYMBOLS = [
  'Ψ', 'ψ', 'δ', 'Δ', 'η', 'σ', 'Σ', 'Ω', 'ω', 'α', 'β', 'γ',
  'θ', 'λ', 'μ', 'φ', 'Φ', 'π', 'ρ', 'τ', 'ε', 'ℏ',
];

const CALC_SYMBOLS = [
  '∇', '∂', '∫', '∮', '∑', '∏', '√', '∞', '∈', '∉', '⊂', '∪',
  '∩', '→', '⇒', '↔', '≈', '≠', '≤', '≥', '±', '×', '·', '°',
];

const MATH_TEMPLATES = [
  { label: 'Ψᵢ(r)', value: 'Ψᵢ(r) = { δ_int, η_loc, j₀, σ_res }' },
  { label: '∂Ψ/∂t', value: '∂Ψ/∂t = ∇·(D ∇Ψ)' },
  { label: '∫ₐᵇ f(x)', value: '∫ₐᵇ f(x) dx' },
  { label: '∑ xᵢ²', value: '∑ᵢ₌₁ⁿ xᵢ²' },
  { label: 'ΔG', value: 'ΔG = ΔH - T·ΔS' },
];

export const TextMathStudio: React.FC<TextMathStudioProps> = ({
  initialValue,
  initialMode,
  initialFontFamily,
  initialFontSize,
  initialTextAlign,
  initialCodeLanguage = 'python',
  screenX,
  screenY,
  boxWidth,
  boxHeight,
  zoom,
  isDarkTheme,
  viewportSize,
  accentColor,
  onCommit,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const [mode, setMode] = useState(initialMode);
  const [fontFamily, setFontFamily] = useState<FontFamily>(initialFontFamily);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [textAlign, setTextAlign] = useState<'left' | 'center'>(
    initialMode === 'shape' || initialMode === 'connector' ? 'center' : initialTextAlign
  );
  const [codeLanguage, setCodeLanguage] = useState(initialCodeLanguage);
  const [showMathDeck, setShowMathDeck] = useState(initialMode === 'math');
  const [mathTab, setMathTab] = useState<'greek' | 'ops' | 'tpl'>('greek');
  const [scriptMode, setScriptMode] = useState<'normal' | 'sub' | 'sup'>('normal');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const committedRef = useRef(false);

  // Refs for latest values so onBlur or outside click commits current state accurately
  const stateRef = useRef({
    value,
    mode,
    fontFamily,
    fontSize,
    textAlign,
    codeLanguage,
  });
  stateRef.current = { value, mode, fontFamily, fontSize, textAlign, codeLanguage };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const handleSubmit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const s = stateRef.current;
    const finalText = s.mode === 'code' ? s.value : formatMathShortcuts(s.value);
    onCommit({
      text: finalText,
      mode: s.mode,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      textAlign: s.textAlign,
      codeLanguage: s.codeLanguage,
    });
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => v + snippet);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const nextVal = value.slice(0, start) + snippet + value.slice(end);
    setValue(nextVal);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = start + snippet.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const handleChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let nextRaw = e.target.value;

    // Live subscript/superscript mode while typing
    if (scriptMode !== 'normal' && nextRaw.length === value.length + 1) {
      const pos = (e.target.selectionStart ?? nextRaw.length) - 1;
      const inserted = nextRaw[pos];
      if (inserted && !/\s/.test(inserted)) {
        const converted = scriptMode === 'sub' ? toSubscript(inserted) : toSuperscript(inserted);
        if (converted !== inserted) {
          const patched = nextRaw.slice(0, pos) + converted + nextRaw.slice(pos + 1);
          setValue(patched);
          requestAnimationFrame(() => {
            textareaRef.current?.setSelectionRange(pos + converted.length, pos + converted.length);
          });
          return;
        }
      }
    }

    // Live Excalidraw-style inline math conversion when typing space or punctuation after a LaTeX macro or ^2 / _i
    if (mode !== 'code' && /[\s()+=,\-*/]$/.test(nextRaw)) {
      const formatted = formatMathShortcuts(nextRaw);
      if (formatted !== nextRaw) {
        setValue(formatted);
        return;
      }
    }

    setValue(nextRaw);
  };

  const handleModeSwitch = (nextMode: 'text' | 'title' | 'math' | 'code') => {
    setMode(nextMode);
    if (nextMode === 'title') {
      setFontFamily('sans');
      setFontSize(26);
      setShowMathDeck(false);
    } else if (nextMode === 'math') {
      setFontFamily('mono');
      setFontSize(19);
      setShowMathDeck(true);
    } else if (nextMode === 'code') {
      setFontFamily('mono');
      setFontSize(13.5);
      setShowMathDeck(false);
    } else {
      setFontFamily('sans');
      setFontSize(18);
      setShowMathDeck(false);
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const isSimpleInline = mode === 'shape' || mode === 'sticky' || mode === 'connector';

  // Auto-calculate Excalidraw-style direct on-canvas dimensions
  const scaledFontSize = Math.max(12, fontSize * zoom);
  const lineHeightPx = scaledFontSize * 1.32;
  const lines = (value || ' ').split('\n');
  const longestChars = lines.reduce((m, l) => Math.max(m, l.length), 1);

  const charWidthFactor = fontFamily === 'mono' ? 0.63 : 0.56;
  const autoWidth = Math.max(
    boxWidth ? boxWidth * zoom : 90,
    Math.ceil(longestChars * scaledFontSize * charWidthFactor + 28)
  );
  const autoHeight = Math.max(
    boxHeight ? boxHeight * zoom : lineHeightPx + 10,
    Math.ceil(lines.length * lineHeightPx + 10)
  );

  // Position direct canvas textarea accurately over the world point
  const clampedX = Math.max(8, Math.min(viewportSize.width - 100, screenX));
  const clampedY = Math.max(48, Math.min(viewportSize.height - 60, screenY));

  const floatingBarClass = isDarkTheme
    ? 'lavish-popover-dark text-[#f5f5f7]'
    : 'lavish-popover-light text-[#1d1d1f]';

  // Anchor the interactive format & math bar right above the text being edited (or below if near the top bar)
  const ribbonCenterX = Math.max(220, Math.min(viewportSize.width - 220, clampedX + autoWidth / 2));
  const rawRibbonTop = clampedY - (showMathDeck ? 116 : 46);
  const safeRibbonTop =
    rawRibbonTop < 56
      ? Math.min(viewportSize.height - 120, clampedY + autoHeight + 12)
      : rawRibbonTop;

  return (
    <>
      {/* 1. Contextual Interactive Apple Formatting & Math Bar (Anchored right above/below active text) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          left: `${ribbonCenterX}px`,
          top: `${safeRibbonTop}px`,
          transform: 'translateX(-50%)',
        }}
        className={`fixed z-50 max-w-[calc(100vw-16px)] rounded-2xl px-2.5 py-1.5 flex flex-col items-center gap-1.5 transition-all ${floatingBarClass}`}
      >
        <div className="flex flex-wrap items-center justify-center gap-1 text-[11px]">
          {!isSimpleInline && (
            <div className="flex items-center gap-0.5 bg-black/15 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handleModeSwitch('text')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition ${
                  mode === 'text'
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Type size={11} />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('title')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition ${
                  mode === 'title'
                    ? 'bg-[#FF9F0A] text-slate-950 font-semibold shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Heading1 size={11} />
                <span>Title</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('math')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition ${
                  mode === 'math'
                    ? 'bg-[#30D5C8] text-slate-950 font-semibold shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <FunctionSquare size={11} />
                <span>Math Ψ</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('code')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition ${
                  mode === 'code'
                    ? 'bg-[#5856D6] text-white font-semibold shadow-sm'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Code2 size={11} />
                <span>Code</span>
              </button>
            </div>
          )}

          {mode === 'code' ? (
            <div className="flex items-center gap-0.5 bg-black/15 p-0.5 rounded-xl">
              {['python', 'typescript', 'javascript', 'cpp', 'matlab', 'sql', 'bash', 'json'].map(
                (l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setCodeLanguage(l)}
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase transition ${
                      codeLanguage === l
                        ? 'bg-[#5856D6] text-white'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {l === 'typescript'
                      ? 'TS'
                      : l === 'javascript'
                        ? 'JS'
                        : l === 'python'
                          ? 'PY'
                          : l}
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-0.5 bg-black/15 p-0.5 rounded-xl">
                {(
                  [
                    { id: 'sans', label: 'SF Pro' },
                    { id: 'rounded', label: 'Round' },
                    { id: 'serif', label: 'New York' },
                    { id: 'mono', label: 'SF Mono' },
                  ] as Array<{ id: FontFamily; label: string }>
                ).map((ff) => {
                  const cur = fontFamily === 'hand' ? 'rounded' : fontFamily;
                  return (
                    <button
                      key={ff.id}
                      type="button"
                      onClick={() => setFontFamily(ff.id)}
                      className={`px-1.5 py-0.5 rounded-lg text-[10.5px] font-medium transition ${
                        cur === ff.id
                          ? 'bg-white/20 font-semibold'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {ff.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-0.5 bg-black/15 p-0.5 rounded-xl">
                {[
                  { label: 'S', size: 15 },
                  { label: 'M', size: 19 },
                  { label: 'L', size: 26 },
                  { label: 'XL', size: 34 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFontSize(preset.size)}
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                      Math.abs(fontSize - preset.size) <= 2
                        ? 'bg-[#007AFF] text-white'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setTextAlign((a) => (a === 'left' ? 'center' : 'left'))}
                title="Toggle Alignment"
                className="p-1 rounded-lg bg-black/15 hover:bg-black/25 transition"
              >
                {textAlign === 'center' ? <AlignCenter size={12} /> : <AlignLeft size={12} />}
              </button>

              <button
                type="button"
                onClick={() => setShowMathDeck((v) => !v)}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border transition ${
                  showMathDeck
                    ? 'bg-[#30D5C8]/20 border-[#30D5C8] text-[#30D5C8]'
                    : 'border-current/15 opacity-80 hover:opacity-100'
                }`}
              >
                ∑ Symbols
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            title="Commit (Click anywhere on canvas or press Esc / Ctrl+Enter)"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#30D158] hover:bg-[#28b84c] text-slate-950 text-[10.5px] font-semibold shadow-sm transition"
          >
            <Check size={11} />
            <span>Done</span>
          </button>
        </div>

        {/* Collapsible Interactive Math Quick-Ribbon */}
        {showMathDeck && mode !== 'code' && (
          <div className="w-full max-w-[460px] pt-1 border-t border-current/10 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'greek', label: 'Greek' },
                    { id: 'ops', label: 'Calculus & Logic' },
                    { id: 'tpl', label: 'Equations' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMathTab(tab.id)}
                    className={`px-1.5 py-0.5 rounded-md font-medium transition ${
                      mathTab === tab.id
                        ? 'bg-[#30D5C8]/25 text-[#30D5C8] font-semibold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setScriptMode((s) => (s === 'sub' ? 'normal' : 'sub'))}
                  className={`px-1.5 py-0.5 rounded-md font-semibold border transition ${
                    scriptMode === 'sub'
                      ? 'bg-[#007AFF] text-white border-[#007AFF]'
                      : 'border-current/15 opacity-80'
                  }`}
                >
                  xᵢ Sub
                </button>
                <button
                  type="button"
                  onClick={() => setScriptMode((s) => (s === 'sup' ? 'normal' : 'sup'))}
                  className={`px-1.5 py-0.5 rounded-md font-semibold border transition ${
                    scriptMode === 'sup'
                      ? 'bg-[#007AFF] text-white border-[#007AFF]'
                      : 'border-current/15 opacity-80'
                  }`}
                >
                  x² Sup
                </button>
                <button
                  type="button"
                  onClick={() => insertAtCursor('√( )')}
                  className="px-1.5 py-0.5 rounded-md border border-current/15 opacity-85 hover:opacity-100"
                >
                  √
                </button>
                <button
                  type="button"
                  onClick={() => insertAtCursor('( )/( )')}
                  className="px-1.5 py-0.5 rounded-md border border-current/15 opacity-85 hover:opacity-100"
                >
                  a/b
                </button>
              </div>
            </div>

            {mathTab === 'tpl' ? (
              <div className="flex flex-wrap gap-1">
                {MATH_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => insertAtCursor(tpl.value)}
                    className="px-2 py-0.5 rounded-lg bg-black/15 hover:bg-[#30D5C8]/25 text-[11px] font-mono transition"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-0.5">
                {(mathTab === 'greek' ? GREEK_SYMBOLS : CALC_SYMBOLS).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => insertAtCursor(sym)}
                    className="w-6 h-6 rounded-md bg-black/15 hover:bg-[#30D5C8]/25 text-xs font-mono transition flex items-center justify-center"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Excalidraw-Native Direct On-Canvas Auto-Expanding Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        placeholder={mode === 'code' ? '// Type code...' : ''}
        onChange={handleChangeText}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            if (value.trim() === initialValue.trim() && !initialValue) {
              committedRef.current = true;
              onCancel();
            } else {
              handleSubmit();
            }
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Tab' && mode === 'code') {
            e.preventDefault();
            insertAtCursor('  ');
          }
        }}
        style={{
          position: 'fixed',
          left: `${clampedX}px`,
          top: `${clampedY}px`,
          width: `${Math.min(viewportSize.width - clampedX - 8, autoWidth)}px`,
          height: `${autoHeight}px`,
          fontFamily: getFontStack(fontFamily),
          fontSize: `${scaledFontSize}px`,
          fontWeight: mode === 'title' ? 600 : 500,
          lineHeight: `${lineHeightPx}px`,
          color: mode === 'code' ? '#f2f2f7' : mode === 'sticky' ? '#1d1d1f' : accentColor,
          textAlign: mode === 'code' ? 'left' : textAlign,
          background:
            mode === 'code'
              ? 'rgba(28, 30, 38, 0.96)'
              : 'transparent',
          caretColor: '#007AFF',
        }}
        className={`z-40 outline-none resize-none overflow-hidden p-0 m-0 ${
          mode === 'code'
            ? 'rounded-xl border border-[#007AFF]/60 p-3 shadow-2xl'
            : 'border-none bg-transparent shadow-none'
        }`}
      />
    </>
  );
};
