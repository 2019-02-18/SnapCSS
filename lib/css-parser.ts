export interface ParsedCSS {
  /** Tag + selector context */
  selector: string;
  /** Cleaned CSS properties (excluding browser defaults) */
  styles: CSSProperty[];
  /** Font-related properties (subset of styles) */
  font: FontInfo;
  /** Pseudo-element styles */
  pseudoElements: PseudoElementStyles[];
  /** Pseudo-class styles (:hover, :focus, :active) */
  pseudoClasses: PseudoClassStyles[];
}

export interface CSSProperty {
  name: string;
  value: string;
  category: PropertyCategory;
}

export type PropertyCategory =
  | 'layout'
  | 'spacing'
  | 'sizing'
  | 'typography'
  | 'background'
  | 'border'
  | 'effects'
  | 'other';

export interface FontInfo {
  family: string;
  size: string;
  weight: string;
  color: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface PseudoElementStyles {
  pseudo: string;
  content: string;
  styles: CSSProperty[];
}

export interface PseudoClassStyles {
  pseudo: string;
  styles: CSSProperty[];
}

const CATEGORY_MAP: Record<string, PropertyCategory> = {
  display: 'layout', position: 'layout', top: 'layout', right: 'layout',
  bottom: 'layout', left: 'layout', float: 'layout', clear: 'layout',
  'z-index': 'layout', overflow: 'layout', 'overflow-x': 'layout',
  'overflow-y': 'layout', 'flex-direction': 'layout', 'flex-wrap': 'layout',
  'justify-content': 'layout', 'align-items': 'layout', 'align-self': 'layout',
  'align-content': 'layout', flex: 'layout', 'flex-grow': 'layout',
  'flex-shrink': 'layout', 'flex-basis': 'layout', order: 'layout',
  'grid-template-columns': 'layout', 'grid-template-rows': 'layout',
  'grid-column': 'layout', 'grid-row': 'layout', gap: 'layout',
  'column-gap': 'layout', 'row-gap': 'layout',

  margin: 'spacing', 'margin-top': 'spacing', 'margin-right': 'spacing',
  'margin-bottom': 'spacing', 'margin-left': 'spacing',
  padding: 'spacing', 'padding-top': 'spacing', 'padding-right': 'spacing',
  'padding-bottom': 'spacing', 'padding-left': 'spacing',

  width: 'sizing', height: 'sizing', 'min-width': 'sizing',
  'min-height': 'sizing', 'max-width': 'sizing', 'max-height': 'sizing',
  'box-sizing': 'sizing',

  'font-family': 'typography', 'font-size': 'typography',
  'font-weight': 'typography', 'font-style': 'typography',
  'line-height': 'typography', 'letter-spacing': 'typography',
  'text-align': 'typography', 'text-decoration': 'typography',
  'text-transform': 'typography', 'white-space': 'typography',
  'word-break': 'typography', 'word-spacing': 'typography',
  color: 'typography', 'text-overflow': 'typography',
  'text-indent': 'typography', 'vertical-align': 'typography',

  background: 'background', 'background-color': 'background',
  'background-image': 'background', 'background-size': 'background',
  'background-position': 'background', 'background-repeat': 'background',

  border: 'border', 'border-top': 'border', 'border-right': 'border',
  'border-bottom': 'border', 'border-left': 'border',
  'border-width': 'border', 'border-style': 'border', 'border-color': 'border',
  'border-radius': 'border', 'border-top-left-radius': 'border',
  'border-top-right-radius': 'border', 'border-bottom-left-radius': 'border',
  'border-bottom-right-radius': 'border', outline: 'border',
  'outline-width': 'border', 'outline-style': 'border', 'outline-color': 'border',

  opacity: 'effects', 'box-shadow': 'effects', 'text-shadow': 'effects',
  transform: 'effects', transition: 'effects', animation: 'effects',
  filter: 'effects', 'backdrop-filter': 'effects', cursor: 'effects',
  'pointer-events': 'effects', visibility: 'effects',
};

/**
 * Properties whose default value depends on inherited context
 * and should not be filtered via dummy comparison.
 * Instead we check if it's different from the default literal.
 */
const SKIP_PROPERTIES = new Set([
  'animation-delay', 'animation-direction', 'animation-duration',
  'animation-fill-mode', 'animation-iteration-count', 'animation-name',
  'animation-play-state', 'animation-timing-function',
  'transition-delay', 'transition-duration', 'transition-property',
  'transition-timing-function',
  '-webkit-locale',
  'perspective-origin', 'transform-origin',
  'border-block-end-color', 'border-block-start-color',
  'border-inline-end-color', 'border-inline-start-color',
  'column-rule-color', 'caret-color', 'text-decoration-color',
  'outline-color',
  // Logical properties that duplicate physical ones
  'block-size', 'inline-size',
  'min-block-size', 'max-block-size', 'min-inline-size', 'max-inline-size',
  'margin-block-start', 'margin-block-end', 'margin-inline-start', 'margin-inline-end',
  'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end',
  'border-block-start-width', 'border-block-end-width',
  'border-inline-start-width', 'border-inline-end-width',
  'border-block-start-style', 'border-block-end-style',
  'border-inline-start-style', 'border-inline-end-style',
  'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end',
  // Noisy rendering hints
  'text-rendering',
]);

/** Properties that are always noise when at default values */
const NOISE_VALUES: Record<string, string[]> = {
  'background-image': ['none'],
  'background-attachment': ['scroll'],
  'background-clip': ['border-box'],
  'background-origin': ['padding-box'],
  'background-position': ['0% 0%', '0px 0px'],
  'background-size': ['auto', 'auto auto'],
  'border-collapse': ['separate'],
  'box-shadow': ['none'],
  'text-shadow': ['none'],
  transform: ['none'],
  filter: ['none'],
  'backdrop-filter': ['none'],
  transition: ['all 0s ease 0s', 'none'],
  animation: ['none 0s ease 0s 1 normal none running'],
  cursor: ['auto', 'crosshair'],
  'pointer-events': ['auto'],
  visibility: ['visible'],
  opacity: ['1'],
  'text-indent': ['0px'],
  'text-transform': ['none'],
  'text-decoration': ['none'],
  'word-spacing': ['0px'],
  'letter-spacing': ['normal'],
  'white-space': ['normal'],
  'word-break': ['normal'],
  float: ['none'],
  clear: ['none'],
  resize: ['none'],
  'list-style-type': ['disc'],
  'list-style-position': ['outside'],
  'list-style-image': ['none'],
  'table-layout': ['auto'],
  'empty-cells': ['show'],
  'caption-side': ['top'],
};

/** Styles injected by SnapCSS itself that should be excluded from output */
const INJECTED_NOISE = new Map<string, string>([
  ['cursor', 'crosshair'],
]);

/** Extract only CSS custom properties explicitly set on this element (inline style) */
function getInlineCustomProperties(element: Element): Set<string> {
  const vars = new Set<string>();
  const inlineStyle = (element as HTMLElement).style;
  if (!inlineStyle) return vars;

  for (let i = 0; i < inlineStyle.length; i++) {
    const prop = inlineStyle[i];
    if (prop.startsWith('--')) {
      vars.add(prop);
    }
  }

  // Also check stylesheets for rules directly targeting this element
  try {
    const matchedRules = getMatchedCSSRules(element);
    for (const rule of matchedRules) {
      const style = rule.style;
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        if (prop.startsWith('--')) {
          vars.add(prop);
        }
      }
    }
  } catch {
    // Cross-origin stylesheets may throw
  }

  return vars;
}

/** Get CSS rules that directly match an element */
function getMatchedCSSRules(element: Element): CSSStyleRule[] {
  const matched: CSSStyleRule[] = [];
  collectMatchingRules(element, null, matched);
  return matched;
}

/**
 * Collect rules matching element, optionally filtering by pseudo-class.
 * If pseudoClass is provided (e.g. ':hover'), matches rules whose selector
 * contains that pseudo-class and whose base selector matches the element.
 */
function collectMatchingRules(
  element: Element,
  pseudoClass: string | null,
  out: CSSStyleRule[],
) {
  for (let s = 0; s < document.styleSheets.length; s++) {
    let rules: CSSRuleList;
    try {
      rules = document.styleSheets[s].cssRules;
    } catch {
      continue;
    }
    collectFromRuleList(element, pseudoClass, rules, out);
  }
}

function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return 'cssRules' in rule && rule instanceof CSSRule &&
    !(rule instanceof CSSStyleRule);
}

function collectFromRuleList(
  element: Element,
  pseudoClass: string | null,
  rules: CSSRuleList,
  out: CSSStyleRule[],
) {
  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];

    if (isGroupingRule(rule)) {
      try {
        collectFromRuleList(element, pseudoClass, (rule as CSSGroupingRule).cssRules, out);
      } catch { /* inaccessible */ }
      continue;
    }

    if (!(rule instanceof CSSStyleRule)) continue;

    try {
      const sel = rule.selectorText;
      if (pseudoClass) {
        if (!sel.includes(pseudoClass)) continue;
        const pcLiteral = pseudoClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const baseSel = sel.replace(new RegExp(pcLiteral, 'g'), '').trim();
        if (baseSel && element.matches(baseSel)) {
          out.push(rule);
        }
      } else {
        if (element.matches(sel)) {
          out.push(rule);
        }
      }
    } catch {
      // Invalid selector
    }
  }
}

/**
 * Build a map of property → authored value from matched rules.
 * Later rules (higher specificity/cascade) win.
 * Inline styles have highest priority.
 */
function getAuthoredValues(element: Element): Map<string, string> {
  const map = new Map<string, string>();
  const rules = getMatchedCSSRules(element);

  for (const rule of rules) {
    const style = rule.style;
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      const val = style.getPropertyValue(prop);
      if (val) map.set(prop, val);
    }
  }

  const inline = (element as HTMLElement).style;
  if (inline) {
    for (let i = 0; i < inline.length; i++) {
      const prop = inline[i];
      const val = inline.getPropertyValue(prop);
      if (val) map.set(prop, val);
    }
  }

  return map;
}

const defaultStyleCache = new Map<string, Map<string, string>>();

const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
  'polygon', 'text', 'tspan', 'defs', 'use', 'symbol', 'clippath',
  'mask', 'pattern', 'image', 'foreignobject', 'marker', 'lineargradient',
  'radialgradient', 'stop', 'filter', 'feblend', 'fecolormatrix',
  'fecomponenttransfer', 'fecomposite', 'feconvolvematrix', 'fediffuselighting',
  'fedisplacementmap', 'feflood', 'fegaussianblur', 'feimage', 'femerge',
  'femorphology', 'feoffset', 'fespecularlighting', 'fetile', 'feturbulence',
]);

function isSVGTag(tagName: string): boolean {
  return SVG_TAGS.has(tagName.toLowerCase());
}

function createElementForTag(doc: Document, tagName: string): Element {
  if (isSVGTag(tagName)) {
    return doc.createElementNS('http://www.w3.org/2000/svg', tagName);
  }
  return doc.createElement(tagName);
}

function getDefaultStyles(tagName: string): Map<string, string> {
  const cached = defaultStyleCache.get(tagName);
  if (cached) return cached;

  const defaults = new Map<string, string>();

  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;opacity:0;pointer-events:none;';
    iframe.setAttribute('data-snapcss', '');
    document.documentElement.appendChild(iframe);

    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;

    if (iframeDoc && iframeWin) {
      let container: Element = iframeDoc.body;
      if (isSVGTag(tagName)) {
        const svgRoot = iframeDoc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iframeDoc.body.appendChild(svgRoot);
        container = svgRoot;
      }

      const el = createElementForTag(iframeDoc, tagName);
      container.appendChild(el);

      const computed = iframeWin.getComputedStyle(el);
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        defaults.set(prop, computed.getPropertyValue(prop));
      }
    }

    iframe.remove();
  } catch {
    try {
      let container: Element = document.documentElement;
      if (isSVGTag(tagName)) {
        const svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgRoot.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';
        svgRoot.setAttribute('data-snapcss', '');
        document.documentElement.appendChild(svgRoot);
        container = svgRoot;
      }

      const dummy = createElementForTag(document, tagName);
      if (!isSVGTag(tagName)) {
        (dummy as HTMLElement).style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';
      }
      dummy.setAttribute('data-snapcss', '');
      container.appendChild(dummy);

      const computed = getComputedStyle(dummy);
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        defaults.set(prop, computed.getPropertyValue(prop));
      }

      if (isSVGTag(tagName)) {
        container.remove();
      } else {
        dummy.remove();
      }
    } catch {
      // Give up, return empty defaults
    }
  }

  defaultStyleCache.set(tagName, defaults);
  return defaults;
}

function categorize(prop: string): PropertyCategory {
  return CATEGORY_MAP[prop] ?? 'other';
}

function isShorthandCovered(prop: string, allProps: Set<string>): boolean {
  const shorthands: Record<string, string[]> = {
    margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
    padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
    border: ['border-top', 'border-right', 'border-bottom', 'border-left'],
    'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
    'border-style': ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'],
    'border-color': ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'],
    'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
    background: ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat'],
  };

  const longforms = shorthands[prop];
  if (!longforms) return false;
  return longforms.every(lf => allProps.has(lf));
}

export function extractCSS(element: Element): ParsedCSS {
  const tagName = element.tagName.toLowerCase();
  const computed = getComputedStyle(element);
  const defaults = getDefaultStyles(tagName);
  const authored = getAuthoredValues(element);

  const diffProps: CSSProperty[] = [];
  const diffNames = new Set<string>();

  const inlineVars = getInlineCustomProperties(element);

  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];

    if (prop.startsWith('--')) {
      if (!inlineVars.has(prop)) continue;
      diffProps.push({ name: prop, value: computed.getPropertyValue(prop), category: 'other' });
      diffNames.add(prop);
      continue;
    }

    if (prop.startsWith('-webkit-') && !prop.startsWith('-webkit-text') &&
        !prop.startsWith('-webkit-backdrop') && !prop.startsWith('-webkit-filter')) {
      continue;
    }
    if (SKIP_PROPERTIES.has(prop)) continue;
    if (INJECTED_NOISE.has(prop) && INJECTED_NOISE.get(prop) === computed.getPropertyValue(prop)) {
      continue;
    }

    const computedValue = computed.getPropertyValue(prop);
    const defaultValue = defaults.get(prop);

    if (computedValue === defaultValue) continue;

    const noiseVals = NOISE_VALUES[prop];
    if (noiseVals && noiseVals.includes(computedValue)) continue;

    if (computedValue === '0px' && (prop.startsWith('margin') || prop.startsWith('padding') ||
        prop.startsWith('border') && prop.endsWith('width'))) {
      if (defaultValue === '0px') continue;
    }

    const value = authored.get(prop) || computedValue;
    diffProps.push({ name: prop, value, category: categorize(prop) });
    diffNames.add(prop);
  }

  const filtered = diffProps.filter(p => !isShorthandCovered(p.name, diffNames));

  const authoredSize = authored.get('font-size') || computed.fontSize;
  const authoredLineHeight = authored.get('line-height') || computed.lineHeight;
  const authoredLetterSpacing = authored.get('letter-spacing') || computed.letterSpacing;

  const font: FontInfo = {
    family: computed.fontFamily,
    size: authoredSize,
    weight: computed.fontWeight,
    color: computed.color,
    lineHeight: authoredLineHeight,
    letterSpacing: authoredLetterSpacing,
  };

  const pseudoElements = extractPseudoElements(element);
  const pseudoClasses = extractPseudoClasses(element);

  const selector = buildSelector(element);

  return {
    selector,
    styles: sortProperties(filtered),
    font,
    pseudoElements,
    pseudoClasses,
  };
}

function extractPseudoElements(element: Element): PseudoElementStyles[] {
  const results: PseudoElementStyles[] = [];

  for (const pseudo of ['::before', '::after']) {
    const computed = getComputedStyle(element, pseudo);
    const content = computed.getPropertyValue('content');

    if (!content || content === 'none' || content === 'normal') continue;

    const defaults = getDefaultPseudoStyles(element.tagName.toLowerCase(), pseudo);
    const styles: CSSProperty[] = [];

    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith('-webkit-') || SKIP_PROPERTIES.has(prop)) continue;

      const value = computed.getPropertyValue(prop);
      const defaultValue = defaults.get(prop);
      if (value === defaultValue) continue;

      const noiseVals = NOISE_VALUES[prop];
      if (noiseVals && noiseVals.includes(value)) continue;

      styles.push({ name: prop, value, category: categorize(prop) });
    }

    results.push({ pseudo, content, styles: sortProperties(styles) });
  }

  return results;
}

const pseudoDefaultCache = new Map<string, Map<string, string>>();

function getDefaultPseudoStyles(tagName: string, pseudo: string): Map<string, string> {
  const key = `${tagName}${pseudo}`;
  const cached = pseudoDefaultCache.get(key);
  if (cached) return cached;

  const dummy = document.createElement(tagName);
  dummy.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';
  dummy.setAttribute('data-snapcss', '');
  document.documentElement.appendChild(dummy);

  const computed = getComputedStyle(dummy, pseudo);
  const defaults = new Map<string, string>();

  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    defaults.set(prop, computed.getPropertyValue(prop));
  }

  dummy.remove();
  pseudoDefaultCache.set(key, defaults);
  return defaults;
}

const PSEUDO_CLASSES = [':hover', ':focus', ':active', ':focus-visible', ':focus-within'] as const;

function extractPseudoClasses(element: Element): PseudoClassStyles[] {
  const results: PseudoClassStyles[] = [];

  for (const pc of PSEUDO_CLASSES) {
    const rules: CSSStyleRule[] = [];
    collectMatchingRules(element, pc, rules);
    if (rules.length === 0) continue;

    const props: CSSProperty[] = [];
    const seen = new Set<string>();

    for (const rule of rules) {
      const style = rule.style;
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        if (prop.startsWith('-webkit-') || prop.startsWith('--')) continue;
        if (SKIP_PROPERTIES.has(prop)) continue;
        if (seen.has(prop)) continue;
        seen.add(prop);

        const value = style.getPropertyValue(prop);
        if (!value) continue;

        const noiseVals = NOISE_VALUES[prop];
        if (noiseVals && noiseVals.includes(value)) continue;

        props.push({ name: prop, value, category: categorize(prop) });
      }
    }

    if (props.length > 0) {
      results.push({ pseudo: pc, styles: sortProperties(props) });
    }
  }

  return results;
}

function buildSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  let selector = tag;
  if (el.id) {
    selector += `#${el.id}`;
  } else if (el.classList.length > 0) {
    selector += '.' + Array.from(el.classList).slice(0, 2).join('.');
    if (el.classList.length > 2) {
      selector += `  (+${el.classList.length - 2})`;
    }
  }
  return selector;
}

const CATEGORY_ORDER: PropertyCategory[] = [
  'layout', 'sizing', 'spacing', 'typography', 'background', 'border', 'effects', 'other',
];

function sortProperties(props: CSSProperty[]): CSSProperty[] {
  return props.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

export function formatCSS(parsed: ParsedCSS, format: 'css' | 'css-variables' | 'minified' = 'css'): string {
  const lines: string[] = [];

  if (format === 'minified') {
    const props = parsed.styles.map(p => `${p.name}:${p.value}`).join(';');
    lines.push(`${parsed.selector} { ${props}; }`);

    for (const pe of parsed.pseudoElements) {
      const peProps = pe.styles.map(p => `${p.name}:${p.value}`).join(';');
      lines.push(`${parsed.selector}${pe.pseudo} { content:${pe.content};${peProps}; }`);
    }

    for (const pc of parsed.pseudoClasses) {
      const pcProps = pc.styles.map(p => `${p.name}:${p.value}`).join(';');
      lines.push(`${parsed.selector}${pc.pseudo} { ${pcProps}; }`);
    }

    return lines.join('\n');
  }

  if (format === 'css-variables') {
    lines.push(`${parsed.selector} {`);
    for (const p of parsed.styles) {
      const varName = `--${p.name}`;
      lines.push(`  ${varName}: ${p.value};`);
    }
    lines.push('}');
  } else {
    lines.push(`${parsed.selector} {`);
    let lastCategory: PropertyCategory | null = null;

    for (const p of parsed.styles) {
      if (lastCategory !== null && p.category !== lastCategory) {
        lines.push('');
      }
      lines.push(`  ${p.name}: ${p.value};`);
      lastCategory = p.category;
    }
    lines.push('}');
  }

  for (const pe of parsed.pseudoElements) {
    lines.push('');
    lines.push(`${parsed.selector}${pe.pseudo} {`);
    lines.push(`  content: ${pe.content};`);
    for (const p of pe.styles) {
      lines.push(`  ${p.name}: ${p.value};`);
    }
    lines.push('}');
  }

  for (const pc of parsed.pseudoClasses) {
    lines.push('');
    lines.push(`${parsed.selector}${pc.pseudo} {`);
    for (const p of pc.styles) {
      lines.push(`  ${p.name}: ${p.value};`);
    }
    lines.push('}');
  }

  return lines.join('\n');
}

export function clearCaches() {
  defaultStyleCache.clear();
  pseudoDefaultCache.clear();
}
