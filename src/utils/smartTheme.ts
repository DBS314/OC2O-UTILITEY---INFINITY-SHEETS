import {
  BoardElement,
  ColorAssistMode,
  CorePaletteId,
  ElementType,
  FillStyle,
  FontFamily,
  PaletteId,
  SemanticRole,
  StyleConfig,
} from '../types/board';

export interface VariablePalette {
  id: CorePaletteId;
  name: string;
  description: string;
  nodeCycle: string[];
  roles: {
    title: { color: string; fontSize: number; fontFamily: FontFamily };
    math: { color: string; fontSize: number; fontFamily: FontFamily };
    connector: { color: string; strokeWidth: number };
    sketch: { color: string };
    code: { color: string };
    flowchart: { colors: string[]; fillStyle: FillStyle };
  };
}

export const CORE_PALETTES: CorePaletteId[] = ['oc20', 'freeform', 'eyecare', 'xcode', 'academic'];

const PALETTE_DEFS: Record<CorePaletteId, VariablePalette> = {
  oc20: {
    id: 'oc20',
    name: 'OC20 Brand Harmony',
    description: 'Ocean Blue, Aqua, Leaf Green, Solar Orange, Gold & Coral',
    nodeCycle: ['#0a84ff', '#30d5c8', '#30d158', '#ff9f0a', '#ffd60a', '#ff453a'],
    roles: {
      title: { color: '#ffd60a', fontSize: 26, fontFamily: 'sans' },
      math: { color: '#30d5c8', fontSize: 19, fontFamily: 'mono' },
      connector: { color: '#98a2b3', strokeWidth: 2 },
      sketch: { color: '#f2f2f7' },
      code: { color: '#64d2ff' },
      flowchart: {
        colors: ['#0a84ff', '#30d5c8', '#30d158', '#ff9f0a', '#ffd60a', '#ff453a'],
        fillStyle: 'semi',
      },
    },
  },
  freeform: {
    id: 'freeform',
    name: 'Apple Freeform',
    description: 'Clean macOS System Blue, Teal, Mint, Indigo & Peach',
    nodeCycle: ['#007aff', '#5ac8fa', '#34c759', '#5856d6', '#ff9500', '#ff375f'],
    roles: {
      title: { color: '#5ac8fa', fontSize: 26, fontFamily: 'sans' },
      math: { color: '#30d158', fontSize: 19, fontFamily: 'mono' },
      connector: { color: '#8e8e93', strokeWidth: 2 },
      sketch: { color: '#f5f5f7' },
      code: { color: '#64d2ff' },
      flowchart: {
        colors: ['#007aff', '#5ac8fa', '#34c759', '#5856d6', '#ff9500', '#ff375f'],
        fillStyle: 'semi',
      },
    },
  },
  eyecare: {
    id: 'eyecare',
    name: 'Eye-Care Sage',
    description: 'Low-glare muted eucalyptus, slate blue, sand & lavender',
    nodeCycle: ['#6ee7b7', '#7dd3fc', '#fcd34d', '#c4b5fd', '#fda4af', '#93c5fd'],
    roles: {
      title: { color: '#fcd34d', fontSize: 26, fontFamily: 'serif' },
      math: { color: '#6ee7b7', fontSize: 19, fontFamily: 'mono' },
      connector: { color: '#94a3b8', strokeWidth: 2 },
      sketch: { color: '#e2e8f0' },
      code: { color: '#7dd3fc' },
      flowchart: {
        colors: ['#6ee7b7', '#7dd3fc', '#fcd34d', '#c4b5fd', '#fda4af', '#93c5fd'],
        fillStyle: 'semi',
      },
    },
  },
  xcode: {
    id: 'xcode',
    name: 'Xcode Midnight',
    description: 'Apple developer tones: sky cyan, orchid, mint & rose',
    nodeCycle: ['#6bdfff', '#ff7ab2', '#acf2bd', '#d9c97c', '#b281eb', '#ff8170'],
    roles: {
      title: { color: '#d9c97c', fontSize: 26, fontFamily: 'sans' },
      math: { color: '#6bdfff', fontSize: 19, fontFamily: 'mono' },
      connector: { color: '#8e96a6', strokeWidth: 2 },
      sketch: { color: '#f2f4f8' },
      code: { color: '#6bdfff' },
      flowchart: {
        colors: ['#6bdfff', '#ff7ab2', '#acf2bd', '#d9c97c', '#b281eb', '#ff8170'],
        fillStyle: 'semi',
      },
    },
  },
  academic: {
    id: 'academic',
    name: 'Academic Light Ink',
    description: 'Crisp high-contrast inks calibrated for Ivory & Freeform Light',
    nodeCycle: ['#0066cc', '#0e7490', '#15803d', '#b45309', '#be123c', '#5b21b6'],
    roles: {
      title: { color: '#1d1d1f', fontSize: 26, fontFamily: 'serif' },
      math: { color: '#0e7490', fontSize: 19, fontFamily: 'mono' },
      connector: { color: '#636366', strokeWidth: 2 },
      sketch: { color: '#1c1917' },
      code: { color: '#0066cc' },
      flowchart: {
        colors: ['#0066cc', '#0e7490', '#15803d', '#b45309', '#be123c', '#5b21b6'],
        fillStyle: 'hachure',
      },
    },
  },
};

export function resolvePalette(paletteId?: PaletteId): VariablePalette {
  if (!paletteId) return PALETTE_DEFS.oc20;
  if (paletteId in PALETTE_DEFS) {
    return PALETTE_DEFS[paletteId as CorePaletteId];
  }
  if (paletteId === 'cosmic') return PALETTE_DEFS.oc20;
  if (paletteId === 'physics') return PALETTE_DEFS.xcode;
  if (paletteId === 'pastel') return PALETTE_DEFS.eyecare;
  if (paletteId === 'neon') return PALETTE_DEFS.freeform;
  return PALETTE_DEFS.oc20;
}

export const VARIABLE_PALETTES: Record<CorePaletteId, VariablePalette> = PALETTE_DEFS;

const MATH_SYMBOL_REGEX =
  /[=ΨψδΔησΣΩωαβγΓθΘλΛμνφΦπρτεℏ∇∫∮∑∏∂∞∈∉⊂⊆∪∩→←↔⇒≈≠≤≥±×·√⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁱⁿ₀₁₂₃₄₅₆₇₈₉₊₋ᵢⱼₖₙᵣₓₐₑ]/;

export function detectTextRole(
  text: string,
  currentRole?: SemanticRole
): 'title' | 'math' | 'code' | 'sketch' {
  if (currentRole === 'title') return 'title';
  if (currentRole === 'math') return 'math';
  if (currentRole === 'code') return 'code';

  const trimmed = (text || '').trim();
  if (!trimmed) return 'sketch';

  if (trimmed.startsWith('#')) {
    return 'title';
  }

  if (
    MATH_SYMBOL_REGEX.test(trimmed) ||
    /\\[a-zA-Z]+/.test(trimmed) ||
    /[A-Za-z0-9)][_^][0-9a-zA-Z+\-]/.test(trimmed)
  ) {
    return 'math';
  }

  if (
    trimmed.length >= 3 &&
    trimmed.length <= 48 &&
    !trimmed.includes('\n') &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed)
  ) {
    return 'title';
  }

  return 'sketch';
}

export function inferElementRole(el: BoardElement): Exclude<SemanticRole, 'auto'> {
  if (el.semanticRole && el.semanticRole !== 'auto') {
    return el.semanticRole;
  }
  if (el.type === 'code') return 'code';
  if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
    return 'flowchart';
  }
  if (el.type === 'arrow' || el.type === 'line') {
    return 'connector';
  }
  if (el.type === 'text') {
    return detectTextRole(el.text || '', el.semanticRole);
  }
  return 'sketch';
}

export function getHarmonicColor(paletteId: PaletteId | undefined, index: number): string {
  const palette = resolvePalette(paletteId);
  return palette.nodeCycle[Math.abs(index) % palette.nodeCycle.length];
}

export function applyHarmonicColorToElement(
  el: BoardElement,
  color: string,
  colorIndex?: number
): BoardElement {
  if (el.type === 'sticky') {
    return { ...el, fillColor: color, colorIndex };
  }
  if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
    return {
      ...el,
      strokeColor: color,
      fillColor: color,
      fillStyle: el.fillStyle === 'none' ? 'semi' : el.fillStyle,
      colorIndex,
    };
  }
  return {
    ...el,
    strokeColor: color,
    colorIndex,
  };
}

export interface SmartStyleParams {
  tool: ElementType;
  text?: string;
  semanticRole: SemanticRole;
  colorAssistMode: ColorAssistMode;
  paletteId: PaletteId;
  sequenceIndex: number;
  baseStyle: StyleConfig;
}

export interface ResolvedSmartStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fillStyle: FillStyle;
  fontSize: number;
  fontFamily: FontFamily;
  semanticRole: SemanticRole;
  colorIndex: number;
}

export function resolveSmartElementStyle(params: SmartStyleParams): ResolvedSmartStyle {
  const {
    tool,
    text = '',
    semanticRole,
    colorAssistMode,
    paletteId,
    sequenceIndex,
    baseStyle,
  } = params;
  const palette = resolvePalette(paletteId);
  const cycleColor = palette.nodeCycle[Math.abs(sequenceIndex) % palette.nodeCycle.length];

  if (colorAssistMode === 'manual' && semanticRole === 'auto') {
    return {
      strokeColor: baseStyle.strokeColor,
      fillColor:
        tool === 'sticky' && baseStyle.fillColor === 'transparent' ? '#fef08a' : baseStyle.fillColor,
      strokeWidth: baseStyle.strokeWidth,
      fillStyle: tool === 'sticky' ? 'solid' : baseStyle.fillStyle,
      fontSize: tool === 'sticky' ? 16 : baseStyle.fontSize,
      fontFamily: baseStyle.fontFamily,
      semanticRole: 'auto',
      colorIndex: sequenceIndex,
    };
  }

  let effectiveRole: Exclude<SemanticRole, 'auto'>;
  if (semanticRole !== 'auto') {
    effectiveRole = semanticRole;
  } else if (tool === 'code') {
    effectiveRole = 'code';
  } else if (tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond') {
    effectiveRole = 'flowchart';
  } else if (tool === 'arrow' || tool === 'line') {
    effectiveRole = 'connector';
  } else if (tool === 'text') {
    effectiveRole = detectTextRole(text);
  } else {
    effectiveRole = 'sketch';
  }

  if (effectiveRole === 'title') {
    return {
      strokeColor: palette.roles.title.color,
      fillColor: tool === 'sticky' ? '#fef08a' : 'transparent',
      strokeWidth: baseStyle.strokeWidth,
      fillStyle: tool === 'sticky' ? 'solid' : baseStyle.fillStyle,
      fontSize: palette.roles.title.fontSize,
      fontFamily: palette.roles.title.fontFamily,
      semanticRole: 'title',
      colorIndex: sequenceIndex,
    };
  }

  if (effectiveRole === 'math') {
    return {
      strokeColor: palette.roles.math.color,
      fillColor: tool === 'sticky' ? '#fef08a' : 'transparent',
      strokeWidth: baseStyle.strokeWidth,
      fillStyle: tool === 'sticky' ? 'solid' : baseStyle.fillStyle,
      fontSize: palette.roles.math.fontSize,
      fontFamily: palette.roles.math.fontFamily,
      semanticRole: 'math',
      colorIndex: sequenceIndex,
    };
  }

  if (effectiveRole === 'code') {
    return {
      strokeColor: palette.roles.code.color,
      fillColor: '#1c1e26',
      strokeWidth: 1.5,
      fillStyle: 'solid',
      fontSize: 13.5,
      fontFamily: 'mono',
      semanticRole: 'code',
      colorIndex: sequenceIndex,
    };
  }

  if (effectiveRole === 'connector') {
    return {
      strokeColor: palette.roles.connector.color,
      fillColor: 'transparent',
      strokeWidth: palette.roles.connector.strokeWidth,
      fillStyle: 'none',
      fontSize: 13,
      fontFamily: 'sans',
      semanticRole: 'connector',
      colorIndex: sequenceIndex,
    };
  }

  if (effectiveRole === 'flowchart') {
    const flowColors = palette.roles.flowchart.colors;
    const nodeColor =
      colorAssistMode === 'semantic'
        ? flowColors[0]
        : flowColors[Math.abs(sequenceIndex) % flowColors.length];
    return {
      strokeColor: nodeColor,
      fillColor: nodeColor,
      strokeWidth: baseStyle.strokeWidth,
      fillStyle:
        baseStyle.fillStyle === 'none'
          ? palette.roles.flowchart.fillStyle
          : baseStyle.fillStyle,
      fontSize: baseStyle.fontSize,
      fontFamily: baseStyle.fontFamily,
      semanticRole: 'flowchart',
      colorIndex: sequenceIndex,
    };
  }

  if (tool === 'sticky') {
    const stickyColors = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8', '#ddd6fe', '#fed7aa'];
    const noteBg =
      colorAssistMode === 'auto-diff'
        ? stickyColors[Math.abs(sequenceIndex) % stickyColors.length]
        : baseStyle.fillColor === 'transparent'
          ? '#fef08a'
          : baseStyle.fillColor;
    return {
      strokeColor: palette.roles.sketch.color,
      fillColor: noteBg,
      strokeWidth: baseStyle.strokeWidth,
      fillStyle: 'solid',
      fontSize: 16,
      fontFamily: baseStyle.fontFamily,
      semanticRole: 'sketch',
      colorIndex: sequenceIndex,
    };
  }

  const sketchColor =
    colorAssistMode === 'auto-diff' && tool === 'highlighter'
      ? cycleColor
      : palette.roles.sketch.color;

  return {
    strokeColor: sketchColor,
    fillColor: baseStyle.fillColor,
    strokeWidth: baseStyle.strokeWidth,
    fillStyle: baseStyle.fillStyle,
    fontSize: baseStyle.fontSize,
    fontFamily: baseStyle.fontFamily,
    semanticRole: 'sketch',
    colorIndex: sequenceIndex,
  };
}

export function applyRoleToElement(
  el: BoardElement,
  role: Exclude<SemanticRole, 'auto'>,
  paletteId: PaletteId,
  colorIndex = 0
): BoardElement {
  const palette = resolvePalette(paletteId);

  if (role === 'title') {
    return {
      ...el,
      semanticRole: 'title',
      strokeColor: palette.roles.title.color,
      fontSize: palette.roles.title.fontSize,
      fontFamily: palette.roles.title.fontFamily,
    };
  }

  if (role === 'math') {
    return {
      ...el,
      semanticRole: 'math',
      strokeColor: palette.roles.math.color,
      fontSize: palette.roles.math.fontSize,
      fontFamily: palette.roles.math.fontFamily,
    };
  }

  if (role === 'code') {
    return {
      ...el,
      semanticRole: 'code',
      strokeColor: palette.roles.code.color,
      fontFamily: 'mono',
    };
  }

  if (role === 'connector') {
    return {
      ...el,
      semanticRole: 'connector',
      strokeColor: palette.roles.connector.color,
      strokeWidth: palette.roles.connector.strokeWidth,
    };
  }

  if (role === 'flowchart') {
    const flowColors = palette.roles.flowchart.colors;
    const nodeColor = flowColors[Math.abs(colorIndex) % flowColors.length];
    return {
      ...el,
      semanticRole: 'flowchart',
      colorIndex,
      strokeColor: nodeColor,
      fillColor: nodeColor,
      fillStyle: el.fillStyle === 'none' ? palette.roles.flowchart.fillStyle : el.fillStyle,
    };
  }

  return {
    ...el,
    semanticRole: 'sketch',
    strokeColor: palette.roles.sketch.color,
  };
}

export function harmonizePageElements(
  elements: BoardElement[],
  paletteId: PaletteId,
  mode: ColorAssistMode
): BoardElement[] {
  const effectiveMode: ColorAssistMode = mode === 'manual' ? 'auto-diff' : mode;
  let flowCounter = 0;
  let highlightCounter = 0;

  return elements.map((el) => {
    if (el.type === 'image') return el;
    const role = inferElementRole(el);
    if (role === 'flowchart') {
      const idx = effectiveMode === 'semantic' ? 0 : flowCounter++;
      return applyRoleToElement(el, 'flowchart', paletteId, idx);
    }
    if (el.type === 'highlighter') {
      const palette = resolvePalette(paletteId);
      const color = palette.nodeCycle[highlightCounter++ % palette.nodeCycle.length];
      return { ...el, strokeColor: color, semanticRole: 'sketch' };
    }
    return applyRoleToElement(el, role, paletteId, el.colorIndex ?? 0);
  });
}
