import {
  BoardElement,
  BoardPage,
  ColorAssistMode,
  GridType,
  PaletteId,
  ThemeType,
} from '../types/board';

const STORAGE_KEY = 'infinity_board_state_v1';

export interface StoredBoardState {
  pages: BoardPage[];
  activePageId: string;
}

export function createId(prefix = 'el'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createNewPage(
  index: number,
  options?: {
    title?: string;
    theme?: ThemeType;
    grid?: GridType;
    paletteId?: PaletteId;
    colorAssistMode?: ColorAssistMode;
    elements?: BoardElement[];
  }
): BoardPage {
  const now = Date.now();
  return {
    id: createId('page'),
    title: options?.title ?? `Sheet ${index}`,
    createdAt: now,
    updatedAt: now,
    elements: options?.elements ?? [],
    camera: { x: 240, y: 180, zoom: 1 },
    theme: options?.theme ?? 'winter',
    grid: options?.grid ?? 'dots',
    paletteId: options?.paletteId ?? 'oc20',
    colorAssistMode: options?.colorAssistMode ?? 'auto-diff',
    pinned: false,
  };
}

function createStarterPage(): BoardPage {
  const page = createNewPage(1, {
    title: 'Sheet 1',
    theme: 'winter',
    grid: 'dots',
    paletteId: 'oc20',
    elements: [
      {
        id: 'starter-box',
        type: 'rectangle',
        x: -145,
        y: -78,
        width: 290,
        height: 82,
        text: 'OC20 Board\nVisio · Math · Code · Images',
        fontSize: 18,
        fontFamily: 'sans',
        strokeColor: '#0a84ff',
        fillColor: '#0a84ff',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'semi',
        renderMode: 'clean',
        cornerRadius: 14,
        seed: 4219,
        semanticRole: 'flowchart',
      },
      {
        id: 'starter-arrow',
        type: 'arrow',
        x: 0,
        y: 4,
        width: 0,
        height: 48,
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 48 },
        ],
        routeType: 'straight',
        strokeColor: '#98a2b3',
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: 7823,
        semanticRole: 'connector',
      },
      {
        id: 'starter-math',
        type: 'text',
        x: -145,
        y: 62,
        width: 290,
        height: 36,
        text: 'Ψᵢ(r) = { δ_int, η_loc, j₀, σ_res }',
        fontSize: 18,
        fontFamily: 'mono',
        strokeColor: '#30d5c8',
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: 1094,
        semanticRole: 'math',
      },
    ],
  });
  return page;
}

export function loadBoardState(): StoredBoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredBoardState;
      if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        const activeValid = parsed.pages.some((p) => p.id === parsed.activePageId);
        return {
          pages: parsed.pages,
          activePageId: activeValid ? parsed.activePageId : parsed.pages[0].id,
        };
      }
    }
  } catch {
    // Ignore corrupted storage and fall back to starter state
  }
  const starter = createStarterPage();
  return {
    pages: [starter],
    activePageId: starter.id,
  };
}

export function saveBoardState(pages: BoardPage[], activePageId: string): void {
  try {
    const payload: StoredBoardState = { pages, activePageId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function exportProjectJSON(pages: BoardPage[], activePageId: string): void {
  const payload = {
    app: 'InfinityBoard',
    version: 1,
    exportedAt: new Date().toISOString(),
    activePageId,
    pages,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `infinity-board-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectJSON(file: File): Promise<StoredBoardState | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      const activeId = parsed.pages.some((p: BoardPage) => p.id === parsed.activePageId)
        ? parsed.activePageId
        : parsed.pages[0].id;
      return {
        pages: parsed.pages,
        activePageId: activeId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const LATEX_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\Psi(?![A-Za-z])/g, 'Ψ'],
  [/\\psi(?![A-Za-z])/g, 'ψ'],
  [/\\Delta(?![A-Za-z])/g, 'Δ'],
  [/\\delta(?![A-Za-z])/g, 'δ'],
  [/\\eta(?![A-Za-z])/g, 'η'],
  [/\\Sigma(?![A-Za-z])/g, 'Σ'],
  [/\\sigma(?![A-Za-z])/g, 'σ'],
  [/\\Omega(?![A-Za-z])/g, 'Ω'],
  [/\\omega(?![A-Za-z])/g, 'ω'],
  [/\\alpha(?![A-Za-z])/g, 'α'],
  [/\\beta(?![A-Za-z])/g, 'β'],
  [/\\gamma(?![A-Za-z])/g, 'γ'],
  [/\\Gamma(?![A-Za-z])/g, 'Γ'],
  [/\\theta(?![A-Za-z])/g, 'θ'],
  [/\\Theta(?![A-Za-z])/g, 'Θ'],
  [/\\lambda(?![A-Za-z])/g, 'λ'],
  [/\\Lambda(?![A-Za-z])/g, 'Λ'],
  [/\\mu(?![A-Za-z])/g, 'μ'],
  [/\\nu(?![A-Za-z])/g, 'ν'],
  [/\\phi(?![A-Za-z])/g, 'φ'],
  [/\\Phi(?![A-Za-z])/g, 'Φ'],
  [/\\pi(?![A-Za-z])/g, 'π'],
  [/\\rho(?![A-Za-z])/g, 'ρ'],
  [/\\tau(?![A-Za-z])/g, 'τ'],
  [/\\epsilon(?![A-Za-z])/g, 'ε'],
  [/\\nabla(?![A-Za-z])/g, '∇'],
  [/\\oint(?![A-Za-z])/g, '∮'],
  [/\\int(?![A-Za-z])/g, '∫'],
  [/\\sum(?![A-Za-z])/g, '∑'],
  [/\\prod(?![A-Za-z])/g, '∏'],
  [/\\partial(?![A-Za-z])/g, '∂'],
  [/\\infty(?![A-Za-z])/g, '∞'],
  [/\\hbar(?![A-Za-z])/g, 'ℏ'],
  [/\\notin(?![A-Za-z])/g, '∉'],
  [/\\in(?![A-Za-z])/g, '∈'],
  [/\\subset(?![A-Za-z])/g, '⊂'],
  [/\\subseteq(?![A-Za-z])/g, '⊆'],
  [/\\cup(?![A-Za-z])/g, '∪'],
  [/\\cap(?![A-Za-z])/g, '∩'],
  [/\\rightarrow(?![A-Za-z])|\\to(?![A-Za-z])/g, '→'],
  [/\\leftarrow(?![A-Za-z])/g, '←'],
  [/\\leftrightarrow(?![A-Za-z])/g, '↔'],
  [/\\Rightarrow(?![A-Za-z])/g, '⇒'],
  [/\\approx(?![A-Za-z])/g, '≈'],
  [/\\neq(?![A-Za-z])/g, '≠'],
  [/\\leq(?![A-Za-z])/g, '≤'],
  [/\\geq(?![A-Za-z])/g, '≥'],
  [/\\pm(?![A-Za-z])/g, '±'],
  [/\\times(?![A-Za-z])/g, '×'],
  [/\\cdot(?![A-Za-z])/g, '·'],
  [/\\sqrt(?![A-Za-z])/g, '√'],
];

export const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'i': 'ⁱ', 'n': 'ⁿ', 't': 'ᵗ', 'x': 'ˣ',
};

export const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'n': 'ₙ', 'r': 'ᵣ',
  'x': 'ₓ', 'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 't': 'ₜ',
};

export function toSuperscript(ch: string): string {
  return [...ch].map((c) => SUPERSCRIPTS[c] ?? c).join('');
}

export function toSubscript(ch: string): string {
  return [...ch].map((c) => SUBSCRIPTS[c] ?? c).join('');
}

export function formatMathShortcuts(input: string): string {
  let out = input;
  for (const [pattern, replacement] of LATEX_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(/\^\{([^}]+)\}/g, (_, inner) => toSuperscript(inner));
  out = out.replace(/_\{([^}]+)\}/g, (_, inner) => toSubscript(inner));
  out = out.replace(/\^([0-9+\-=()intx])/g, (_, ch) => SUPERSCRIPTS[ch] ?? `^${ch}`);
  out = out.replace(/_([0-9+\-=()ijknrxaeot])/g, (_, ch) => SUBSCRIPTS[ch] ?? `_${ch}`);
  return out;
}
