export interface A11yResult {
  contrast: {
    ratio: number;
    aa: boolean;
    aaa: boolean;
    aaLarge: boolean;
    aaaLarge: boolean;
    foreground: string;
    background: string;
  };
  fontSize: {
    value: string;
    px: number;
    isLargeText: boolean;
    readable: boolean;
  };
}

function parseColor(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1];
  return null;
}

function blendOnWhite(r: number, g: number, b: number, a: number): [number, number, number] {
  return [
    Math.round(r * a + 255 * (1 - a)),
    Math.round(g * a + 255 * (1 - a)),
    Math.round(b * a + 255 * (1 - a)),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getEffectiveBackground(element: Element): string {
  let el: Element | null = element;

  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    const parsed = parseColor(bg);
    if (parsed && parsed[3] > 0) {
      if (parsed[3] < 1) {
        const blended = blendOnWhite(parsed[0], parsed[1], parsed[2], parsed[3]);
        return `rgb(${blended[0]}, ${blended[1]}, ${blended[2]})`;
      }
      return bg;
    }
    el = el.parentElement;
  }

  return 'rgb(255, 255, 255)';
}

export function checkA11y(element: Element): A11yResult {
  const computed = getComputedStyle(element);

  const fgColor = computed.color;
  const bgColor = getEffectiveBackground(element);

  const fg = parseColor(fgColor) || [0, 0, 0, 1];
  const bg = parseColor(bgColor) || [255, 255, 255, 1];

  const fgRGB: [number, number, number] = fg[3] < 1
    ? blendOnWhite(fg[0], fg[1], fg[2], fg[3])
    : [fg[0], fg[1], fg[2]];
  const bgRGB: [number, number, number] = [bg[0], bg[1], bg[2]];

  const fgLum = relativeLuminance(...fgRGB);
  const bgLum = relativeLuminance(...bgRGB);
  const ratio = Math.round(contrastRatio(fgLum, bgLum) * 100) / 100;

  const fontSizeStr = computed.fontSize;
  const fontSizePx = parseFloat(fontSizeStr);
  const fontWeight = parseInt(computed.fontWeight, 10);
  const isBold = fontWeight >= 700;
  const isLargeText = fontSizePx >= 18 || (fontSizePx >= 14 && isBold);

  return {
    contrast: {
      ratio,
      aa: isLargeText ? ratio >= 3 : ratio >= 4.5,
      aaa: isLargeText ? ratio >= 4.5 : ratio >= 7,
      aaLarge: ratio >= 3,
      aaaLarge: ratio >= 4.5,
      foreground: fgColor,
      background: bgColor,
    },
    fontSize: {
      value: fontSizeStr,
      px: fontSizePx,
      isLargeText,
      readable: fontSizePx >= 12,
    },
  };
}
