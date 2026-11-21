import {
  BoardElement,
  ColorAssistMode,
  PaletteId,
  Point,
  StyleConfig,
} from '../types/board';
import { createId, formatMathShortcuts } from './storage';
import { resolvePalette, resolveSmartElementStyle } from './smartTheme';

const LANG_ALIASES: Record<string, string> = {
  py: 'python',
  python3: 'python',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'cpp',
  m: 'matlab',
  octave: 'matlab',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  powershell: 'bash',
  ps1: 'bash',
  rs: 'rust',
  tex: 'latex',
};

export function normalizeCodeLanguage(lang?: string): string {
  const clean = (lang || '').trim().toLowerCase();
  if (!clean) return 'python';
  return LANG_ALIASES[clean] || clean;
}

export function measureCodeDimensions(code: string, fontSize = 13.5): { width: number; height: number } {
  const lines = (code || '').split('\n');
  const maxChars = lines.reduce((acc, line) => Math.max(acc, line.length), 18);
  const charW = fontSize * 0.62;
  const lineH = fontSize * 1.48;
  const gutter = 42;
  const headerH = 32;
  const width = Math.max(250, Math.min(760, Math.ceil(gutter + maxChars * charW + 24)));
  const height = Math.max(88, Math.ceil(headerH + lines.length * lineH + 16));
  return { width, height };
}

function measureSimpleText(text: string, fontSize: number): { width: number; height: number } {
  const lines = (text || ' ').split('\n');
  const maxChars = lines.reduce((acc, line) => Math.max(acc, line.length), 4);
  return {
    width: Math.max(80, Math.min(620, Math.ceil(maxChars * fontSize * 0.56 + 16))),
    height: Math.max(30, Math.ceil(lines.length * fontSize * 1.32 + 6)),
  };
}

function wrapLines(text: string, maxChars = 64): string {
  const paras = text.split('\n');
  const out: string[] = [];
  for (const para of paras) {
    const trimmed = para.trimEnd();
    if (trimmed.length <= maxChars) {
      out.push(trimmed);
      continue;
    }
    const words = trimmed.split(' ');
    let cur = '';
    for (const w of words) {
      if (cur && cur.length + 1 + w.length > maxChars) {
        out.push(cur);
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) out.push(cur);
  }
  return out.join('\n');
}

function cleanInlineMarkdown(text: string): string {
  // Replace inline $...$ or \(...\) math delimiters cleanly and format LaTeX shortcuts
  let out = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => formatMathShortcuts(m.trim()))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => formatMathShortcuts(m.trim()))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => formatMathShortcuts(m.trim()))
    .replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_, pre, m) => `${pre}${formatMathShortcuts(m.trim())}`)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
  return formatMathShortcuts(out);
}

function looksLikeRawCode(text: string): boolean {
  const lines = text.split('\n');
  if (lines.length < 2) return false;
  const codePatterns = [
    /^\s*(import|from|export|def|class|function|const|let|var|return|async|await|#include|using|package|struct|fn|pub)\b/m,
    /[{};]\s*$/m,
    /=>\s*[{(]/,
    /^\s{2,}(if|for|while|elif|else|try|catch)\b/m,
  ];
  let score = 0;
  for (const rx of codePatterns) {
    if (rx.test(text)) score++;
  }
  return score >= 2;
}

function inferCodeLanguage(code: string): string {
  if (/^\s*(def |import |from .+ import )/m.test(code)) return 'python';
  if (/interface |:\s*(string|number|boolean)\b/.test(code)) return 'typescript';
  if (/const |let |=>|console\.log/.test(code)) return 'javascript';
  if (/#include\s*<|std::|int\s+main\s*\(/.test(code)) return 'cpp';
  if (/function\s+\w+\s*=|linspace\(|zeros\(|% /.test(code)) return 'matlab';
  if (/^\s*SELECT\b.+\bFROM\b/im.test(code)) return 'sql';
  if (/^\s*\{[\s\S]*"[\w-]+"\s*:/.test(code)) return 'json';
  if (/^#!\/bin\/|^\s*(npm|git|cd|curl|python)\s+/m.test(code)) return 'bash';
  return 'python';
}

interface ParsedBlock {
  kind: 'title' | 'math' | 'code' | 'text';
  content: string;
  language?: string;
}

export function parseLLMClipboardText(
  rawText: string,
  centerPoint: Point,
  paletteId: PaletteId,
  assistMode: ColorAssistMode,
  baseStyle: StyleConfig
): BoardElement[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Raw code paste without Markdown fences
  if (!normalized.includes('```') && !/^#{1,3}\s/m.test(normalized) && looksLikeRawCode(normalized)) {
    const lang = inferCodeLanguage(normalized);
    const dims = measureCodeDimensions(normalized);
    const resolved = resolveSmartElementStyle({
      tool: 'code',
      semanticRole: 'code',
      colorAssistMode: assistMode,
      paletteId,
      sequenceIndex: 0,
      baseStyle,
    });
    return [
      {
        id: createId('el'),
        type: 'code',
        x: centerPoint.x - dims.width / 2,
        y: centerPoint.y - dims.height / 2,
        width: dims.width,
        height: dims.height,
        text: normalized,
        codeLanguage: lang,
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
      },
    ];
  }

  // Tokenize fenced code blocks, display math blocks, headings, and prose
  const blocks: ParsedBlock[] = [];
  const fenceRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  const pushTextSegment = (segment: string) => {
    const lines = segment.split('\n');
    let textBuffer: string[] = [];

    const flushBuffer = () => {
      const joined = textBuffer.join('\n').trim();
      textBuffer = [];
      if (!joined) return;
      const cleaned = wrapLines(cleanInlineMarkdown(joined), 62);
      blocks.push({ kind: 'text', content: cleaned });
    };

    for (const line of lines) {
      const headingMatch = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushBuffer();
        blocks.push({
          kind: 'title',
          content: cleanInlineMarkdown(headingMatch[2].trim()),
        });
      } else if (line.trim() === '') {
        flushBuffer();
      } else {
        textBuffer.push(line);
      }
    }
    flushBuffer();
  };

  while ((match = fenceRegex.exec(normalized)) !== null) {
    if (match.index > lastIdx) {
      pushTextSegment(normalized.slice(lastIdx, match.index));
    }
    if (match[2] !== undefined) {
      blocks.push({
        kind: 'code',
        language: normalizeCodeLanguage(match[1]),
        content: match[2].replace(/\n$/, ''),
      });
    } else {
      const mathBody = (match[3] ?? match[4] ?? '').trim();
      if (mathBody) {
        blocks.push({
          kind: 'math',
          content: formatMathShortcuts(mathBody),
        });
      }
    }
    lastIdx = fenceRegex.lastIndex;
  }

  if (lastIdx < normalized.length) {
    pushTextSegment(normalized.slice(lastIdx));
  }

  if (blocks.length === 0) {
    blocks.push({
      kind: 'text',
      content: wrapLines(cleanInlineMarkdown(normalized), 62),
    });
  }

  const palette = resolvePalette(paletteId);
  const created: BoardElement[] = [];
  let totalHeight = 0;
  const gap = 16;

  // Build elements first at origin to measure total stack height
  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i];
    if (blk.kind === 'code') {
      const dims = measureCodeDimensions(blk.content);
      created.push({
        id: createId('el'),
        type: 'code',
        x: 0,
        y: totalHeight,
        width: dims.width,
        height: dims.height,
        text: blk.content,
        codeLanguage: blk.language || 'python',
        fontSize: 13.5,
        fontFamily: 'mono',
        strokeColor: palette.roles.code.color,
        fillColor: '#1c1e26',
        strokeWidth: 1.5,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'solid',
        renderMode: 'clean',
        seed: Math.floor(Math.random() * 100000),
        semanticRole: 'code',
      });
      totalHeight += dims.height + gap;
    } else if (blk.kind === 'title') {
      const resolved = resolveSmartElementStyle({
        tool: 'text',
        text: blk.content,
        semanticRole: 'title',
        colorAssistMode: assistMode,
        paletteId,
        sequenceIndex: i,
        baseStyle,
      });
      const dims = measureSimpleText(blk.content, resolved.fontSize);
      created.push({
        id: createId('el'),
        type: 'text',
        x: 0,
        y: totalHeight,
        width: dims.width,
        height: dims.height,
        text: blk.content,
        fontSize: resolved.fontSize,
        fontFamily: resolved.fontFamily,
        strokeColor: resolved.strokeColor,
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: Math.floor(Math.random() * 100000),
        semanticRole: 'title',
      });
      totalHeight += dims.height + gap;
    } else if (blk.kind === 'math') {
      const resolved = resolveSmartElementStyle({
        tool: 'text',
        text: blk.content,
        semanticRole: 'math',
        colorAssistMode: assistMode,
        paletteId,
        sequenceIndex: i,
        baseStyle,
      });
      const dims = measureSimpleText(blk.content, resolved.fontSize);
      created.push({
        id: createId('el'),
        type: 'text',
        x: 0,
        y: totalHeight,
        width: dims.width,
        height: dims.height,
        text: blk.content,
        fontSize: resolved.fontSize,
        fontFamily: resolved.fontFamily,
        strokeColor: resolved.strokeColor,
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: Math.floor(Math.random() * 100000),
        semanticRole: 'math',
      });
      totalHeight += dims.height + gap;
    } else {
      const resolved = resolveSmartElementStyle({
        tool: 'text',
        text: blk.content,
        semanticRole: 'auto',
        colorAssistMode: assistMode,
        paletteId,
        sequenceIndex: i,
        baseStyle,
      });
      const dims = measureSimpleText(blk.content, resolved.fontSize);
      created.push({
        id: createId('el'),
        type: 'text',
        x: 0,
        y: totalHeight,
        width: dims.width,
        height: dims.height,
        text: blk.content,
        fontSize: resolved.fontSize,
        fontFamily: resolved.fontFamily,
        strokeColor: resolved.strokeColor,
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        strokeStyle: 'solid',
        fillStyle: 'none',
        renderMode: 'clean',
        seed: Math.floor(Math.random() * 100000),
        semanticRole: resolved.semanticRole,
      });
      totalHeight += dims.height + gap;
    }
  }

  const maxW = created.reduce((m, el) => Math.max(m, el.width), 200);
  const netH = Math.max(40, totalHeight - gap);
  const originX = centerPoint.x - maxW / 2;
  const originY = centerPoint.y - netH / 2;

  return created.map((el) => ({
    ...el,
    x: originX,
    y: originY + el.y,
  }));
}

export async function compressImageFile(
  file: Blob,
  maxDim = 1280
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        let targetW = img.naturalWidth || 400;
        let targetH = img.naturalHeight || 300;
        if (targetW > maxDim || targetH > maxDim) {
          const ratio = Math.min(maxDim / targetW, maxDim / targetH);
          targetW = Math.round(targetW * ratio);
          targetH = Math.round(targetH * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: String(reader.result), width: targetW, height: targetH });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Preserve alpha for PNGs if needed, otherwise crisp compact WebP/JPEG
        const isPng = file.type === 'image/png' || file.type === 'image/svg+xml';
        const dataUrl = isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/webp', 0.86);

        // Fit initial placement nicely on canvas (~260-380px wide)
        const displayScale = targetW > 360 ? 360 / targetW : 1;
        resolve({
          dataUrl,
          width: Math.max(80, Math.round(targetW * displayScale)),
          height: Math.max(60, Math.round(targetH * displayScale)),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
