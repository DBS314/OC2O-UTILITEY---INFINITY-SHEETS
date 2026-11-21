export type ToolType =
  | 'select'
  | 'pan'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'arrow'
  | 'line'
  | 'text'
  | 'code'
  | 'image'
  | 'sticky'
  | 'laser';

export type ElementType = Exclude<ToolType, 'select' | 'pan' | 'eraser' | 'laser'>;

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'none' | 'semi' | 'hachure' | 'solid';
export type RenderMode = 'sketchy' | 'clean';
export type GridType = 'dots' | 'grid' | 'cross' | 'none';
export type CoreThemeType = 'winter' | 'dusk' | 'carbon' | 'sage' | 'ivory' | 'freeform';
export type ThemeType = CoreThemeType | 'bluespace' | 'dark' | 'light' | 'paper';
export type FontFamily = 'sans' | 'mono' | 'serif' | 'rounded' | 'hand';
export type WheelMode = 'zoom' | 'pan';
export type ColorAssistMode = 'auto-diff' | 'semantic' | 'manual';
export type SemanticRole = 'auto' | 'title' | 'flowchart' | 'connector' | 'math' | 'code' | 'sketch';
export type CorePaletteId = 'oc20' | 'freeform' | 'eyecare' | 'xcode' | 'academic';
export type PaletteId = CorePaletteId | 'cosmic' | 'physics' | 'pastel' | 'neon';
export type RouteType = 'straight' | 'elbow' | 'curved';
export type PortSide = 'n' | 'e' | 's' | 'w';
export type ImageFilter = 'none' | 'invert' | 'grayscale' | 'contrast';

export interface ConnectorBinding {
  elementId: string;
  port: PortSide;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  points?: Point[];
  text?: string;
  textAlign?: 'left' | 'center';
  fontSize?: number;
  fontFamily?: FontFamily;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  renderMode: RenderMode;
  seed: number;
  semanticRole?: SemanticRole;
  colorIndex?: number;
  // Visio shape & connector fields
  cornerRadius?: number;
  routeType?: RouteType;
  controlPoint?: Point;
  startBinding?: ConnectorBinding;
  endBinding?: ConnectorBinding;
  // Code card fields
  codeLanguage?: string;
  // Image studio fields
  imageDataUrl?: string;
  imageFilter?: ImageFilter;
  imageRadius?: number;
  imageShadow?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  crop?: CropRect;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface BoardPage {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  elements: BoardElement[];
  camera: Camera;
  theme: ThemeType;
  grid: GridType;
  pinned?: boolean;
  paletteId?: PaletteId;
  colorAssistMode?: ColorAssistMode;
}

export interface StyleConfig {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  renderMode: RenderMode;
  fontFamily: FontFamily;
  fontSize: number;
}

export interface AmbientGlow {
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  color: string;
}

export interface ThemeConfig {
  id: ThemeType;
  label: string;
  subtitle: string;
  bg: string;
  bgSecondary: string;
  gridColor: string;
  gridMajorColor: string;
  defaultStroke: string;
  isDark: boolean;
  surfaceTint: string;
  previewGradient: string;
  ambientGlows: AmbientGlow[];
}

export const CORE_THEMES: CoreThemeType[] = [
  'winter',
  'dusk',
  'carbon',
  'sage',
  'ivory',
  'freeform',
];

const NORDIC_WINTER: ThemeConfig = {
  id: 'winter',
  label: 'Nordic Winter',
  subtitle: 'Glacial twilight with icy frost & soft snowfall',
  bg: '#08101d',
  bgSecondary: '#0f1c30',
  gridColor: 'rgba(186, 230, 253, 0.095)',
  gridMajorColor: 'rgba(125, 211, 252, 0.28)',
  defaultStroke: '#f0f9ff',
  isDark: true,
  surfaceTint: 'rgba(15, 28, 46, 0.84)',
  previewGradient: 'linear-gradient(135deg, #08101d 0%, #102a45 55%, #1e3a5f 100%)',
  ambientGlows: [
    { xRatio: 0.22, yRatio: 0.16, radiusRatio: 0.62, color: 'rgba(125, 211, 252, 0.16)' },
    { xRatio: 0.80, yRatio: 0.78, radiusRatio: 0.64, color: 'rgba(56, 189, 248, 0.14)' },
    { xRatio: 0.50, yRatio: 0.42, radiusRatio: 0.52, color: 'rgba(186, 230, 253, 0.08)' },
  ],
};

const VELVET_AURORA: ThemeConfig = {
  id: 'dusk',
  label: 'Velvet Aurora',
  subtitle: 'Obsidian velvet with indigo & cyan aurora light',
  bg: '#0c0e16',
  bgSecondary: '#131726',
  gridColor: 'rgba(226, 232, 240, 0.085)',
  gridMajorColor: 'rgba(94, 92, 230, 0.26)',
  defaultStroke: '#f5f5f7',
  isDark: true,
  surfaceTint: 'rgba(28, 30, 42, 0.82)',
  previewGradient: 'linear-gradient(135deg, #0c0e16 0%, #1e1b4b 55%, #0f2942 100%)',
  ambientGlows: [
    { xRatio: 0.16, yRatio: 0.18, radiusRatio: 0.58, color: 'rgba(94, 92, 230, 0.14)' },
    { xRatio: 0.84, yRatio: 0.80, radiusRatio: 0.62, color: 'rgba(10, 132, 255, 0.13)' },
    { xRatio: 0.52, yRatio: 0.45, radiusRatio: 0.48, color: 'rgba(48, 213, 200, 0.06)' },
  ],
};

const MIDNIGHT_SAPPHIRE: ThemeConfig = {
  id: 'carbon',
  label: 'Midnight Sapphire',
  subtitle: 'Deep blue space with warm golden-cyan sheen',
  bg: '#070b15',
  bgSecondary: '#0e172c',
  gridColor: 'rgba(186, 230, 253, 0.085)',
  gridMajorColor: 'rgba(56, 189, 248, 0.26)',
  defaultStroke: '#f8fafc',
  isDark: true,
  surfaceTint: 'rgba(15, 23, 42, 0.84)',
  previewGradient: 'linear-gradient(135deg, #070b15 0%, #0c234a 55%, #3b2a1a 100%)',
  ambientGlows: [
    { xRatio: 0.82, yRatio: 0.20, radiusRatio: 0.65, color: 'rgba(14, 165, 233, 0.15)' },
    { xRatio: 0.24, yRatio: 0.78, radiusRatio: 0.55, color: 'rgba(245, 158, 11, 0.09)' },
    { xRatio: 0.48, yRatio: 0.50, radiusRatio: 0.52, color: 'rgba(59, 130, 246, 0.10)' },
  ],
};

const EMERALD_LOUNGE: ThemeConfig = {
  id: 'sage',
  label: 'Emerald Lounge',
  subtitle: 'Soothing botanical jade & warm gold luminescence',
  bg: '#0b1311',
  bgSecondary: '#12211d',
  gridColor: 'rgba(209, 250, 229, 0.085)',
  gridMajorColor: 'rgba(52, 211, 153, 0.25)',
  defaultStroke: '#ecfdf5',
  isDark: true,
  surfaceTint: 'rgba(18, 30, 26, 0.84)',
  previewGradient: 'linear-gradient(135deg, #0b1311 0%, #11332a 60%, #2d2616 100%)',
  ambientGlows: [
    { xRatio: 0.18, yRatio: 0.24, radiusRatio: 0.58, color: 'rgba(16, 185, 129, 0.13)' },
    { xRatio: 0.80, yRatio: 0.76, radiusRatio: 0.55, color: 'rgba(245, 158, 11, 0.08)' },
  ],
};

const CHAMPAGNE_ATELIER: ThemeConfig = {
  id: 'ivory',
  label: 'Champagne Atelier',
  subtitle: 'Warm cashmere parchment & bronze studio grid',
  bg: '#f7f4ed',
  bgSecondary: '#efeae0',
  gridColor: 'rgba(130, 108, 82, 0.15)',
  gridMajorColor: 'rgba(180, 120, 50, 0.26)',
  defaultStroke: '#1c1917',
  isDark: false,
  surfaceTint: 'rgba(252, 250, 245, 0.88)',
  previewGradient: 'linear-gradient(135deg, #fbf9f5 0%, #f3ece0 55%, #e8decb 100%)',
  ambientGlows: [
    { xRatio: 0.20, yRatio: 0.18, radiusRatio: 0.60, color: 'rgba(251, 191, 36, 0.10)' },
    { xRatio: 0.82, yRatio: 0.80, radiusRatio: 0.60, color: 'rgba(14, 165, 233, 0.07)' },
  ],
};

const PEARL_DAYLIGHT: ThemeConfig = {
  id: 'freeform',
  label: 'Pearl Daylight',
  subtitle: 'Pure frosted silver-pearl with sapphire accents',
  bg: '#f3f5f9',
  bgSecondary: '#e8ecf4',
  gridColor: 'rgba(71, 85, 105, 0.14)',
  gridMajorColor: 'rgba(10, 132, 255, 0.24)',
  defaultStroke: '#1d1d1f',
  isDark: false,
  surfaceTint: 'rgba(255, 255, 255, 0.88)',
  previewGradient: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 55%, #e0f2fe 100%)',
  ambientGlows: [
    { xRatio: 0.78, yRatio: 0.20, radiusRatio: 0.58, color: 'rgba(99, 102, 241, 0.08)' },
    { xRatio: 0.22, yRatio: 0.80, radiusRatio: 0.58, color: 'rgba(14, 165, 233, 0.08)' },
  ],
};

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  winter: NORDIC_WINTER,
  dusk: VELVET_AURORA,
  carbon: MIDNIGHT_SAPPHIRE,
  sage: EMERALD_LOUNGE,
  ivory: CHAMPAGNE_ATELIER,
  freeform: PEARL_DAYLIGHT,
  bluespace: MIDNIGHT_SAPPHIRE,
  dark: VELVET_AURORA,
  light: PEARL_DAYLIGHT,
  paper: CHAMPAGNE_ATELIER,
};

export function resolveThemeConfig(theme: ThemeType): ThemeConfig {
  return THEME_CONFIGS[theme] || THEME_CONFIGS.winter;
}

export const STROKE_PALETTE = [
  '#f2f2f7', // Apple System White
  '#0a84ff', // Apple Blue
  '#30d5c8', // OC20 Aqua
  '#30d158', // Apple Green
  '#ff9f0a', // Apple Orange
  '#ffd60a', // Apple Yellow
  '#ff453a', // Apple Red
  '#1d1d1f', // Apple Ink
];

export const FILL_PALETTE = [
  'transparent',
  '#0a84ff',
  '#30d5c8',
  '#30d158',
  '#ff9f0a',
  '#bf5af2',
  '#ff453a',
  '#fef08a',
];
