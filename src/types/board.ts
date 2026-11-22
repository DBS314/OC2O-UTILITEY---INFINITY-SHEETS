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
  label: 'Winter Slate',
  subtitle: 'Cool matte winter slate',
  bg: '#141921',
  bgSecondary: '#161c26',
  gridColor: 'rgba(203, 213, 225, 0.08)',
  gridMajorColor: 'rgba(148, 163, 184, 0.18)',
  defaultStroke: '#eef2f6',
  isDark: true,
  surfaceTint: 'rgba(20, 25, 33, 0.90)',
  previewGradient: 'linear-gradient(135deg, #141921 0%, #1d2532 100%)',
  ambientGlows: [
    { xRatio: 0.5, yRatio: 0.0, radiusRatio: 0.75, color: 'rgba(148, 184, 218, 0.045)' },
  ],
};

const VELVET_AURORA: ThemeConfig = {
  id: 'dusk',
  label: 'Graphite',
  subtitle: 'Neutral macOS dark matte',
  bg: '#18191c',
  bgSecondary: '#18191c',
  gridColor: 'rgba(255, 255, 255, 0.065)',
  gridMajorColor: 'rgba(255, 255, 255, 0.14)',
  defaultStroke: '#f2f2f7',
  isDark: true,
  surfaceTint: 'rgba(24, 25, 28, 0.90)',
  previewGradient: 'linear-gradient(135deg, #18191c 0%, #23252a 100%)',
  ambientGlows: [],
};

const MIDNIGHT_SAPPHIRE: ThemeConfig = {
  id: 'carbon',
  label: 'Deep Navy',
  subtitle: 'Technical blueprint navy',
  bg: '#0f1624',
  bgSecondary: '#111929',
  gridColor: 'rgba(148, 163, 184, 0.085)',
  gridMajorColor: 'rgba(148, 163, 184, 0.19)',
  defaultStroke: '#f1f5f9',
  isDark: true,
  surfaceTint: 'rgba(15, 22, 36, 0.90)',
  previewGradient: 'linear-gradient(135deg, #0f1624 0%, #182338 100%)',
  ambientGlows: [],
};

const EMERALD_LOUNGE: ThemeConfig = {
  id: 'sage',
  label: 'Chalkboard',
  subtitle: 'Low-glare matte green slate',
  bg: '#141c19',
  bgSecondary: '#151e1b',
  gridColor: 'rgba(209, 250, 229, 0.065)',
  gridMajorColor: 'rgba(167, 243, 208, 0.14)',
  defaultStroke: '#ecfdf5',
  isDark: true,
  surfaceTint: 'rgba(20, 28, 25, 0.90)',
  previewGradient: 'linear-gradient(135deg, #141c19 0%, #1c2824 100%)',
  ambientGlows: [],
};

const CHAMPAGNE_ATELIER: ThemeConfig = {
  id: 'ivory',
  label: 'Warm Paper',
  subtitle: 'Matte archival cream paper',
  bg: '#f7f5f0',
  bgSecondary: '#f7f5f0',
  gridColor: 'rgba(120, 113, 108, 0.14)',
  gridMajorColor: 'rgba(120, 113, 108, 0.26)',
  defaultStroke: '#1c1917',
  isDark: false,
  surfaceTint: 'rgba(247, 245, 240, 0.92)',
  previewGradient: 'linear-gradient(135deg, #f7f5f0 0%, #eeebe3 100%)',
  ambientGlows: [],
};

const PEARL_DAYLIGHT: ThemeConfig = {
  id: 'freeform',
  label: 'Studio White',
  subtitle: 'Crisp Apple Freeform white',
  bg: '#fbfbfc',
  bgSecondary: '#fbfbfc',
  gridColor: 'rgba(100, 116, 139, 0.13)',
  gridMajorColor: 'rgba(100, 116, 139, 0.25)',
  defaultStroke: '#1d1d1f',
  isDark: false,
  surfaceTint: 'rgba(251, 251, 252, 0.92)',
  previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
  ambientGlows: [],
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
