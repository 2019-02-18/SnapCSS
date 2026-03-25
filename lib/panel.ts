import type { ParsedCSS, CSSProperty, PropertyCategory, PseudoClassStyles } from './css-parser';
import type { ElementInfo } from './inspector';
import { t } from './i18n';

const PANEL_WIDTH = 320;
const PANEL_MAX_HEIGHT = 480;

export class Panel {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private container: HTMLElement | null = null;
  private visible = false;
  private dragging = false;
  private dragOffset = { x: 0, y: 0 };
  private onCopy: ((css: string) => void) | null = null;
  private onClose: (() => void) | null = null;
  private currentTheme: string = 'system';
  private locked = false;

  constructor(onCopy?: (css: string) => void, onClose?: () => void) {
    this.onCopy = onCopy ?? null;
    this.onClose = onClose ?? null;
  }

  show(info: ElementInfo, parsed: ParsedCSS, formattedCSS: string) {
    this.ensureHost();
    this.render(info, parsed, formattedCSS);
    this.position(info.rect);
    this.visible = true;
  }

  hide() {
    if (this.host) {
      this.host.style.opacity = '0';
      this.host.style.transform = 'scale(0.96)';
      setTimeout(() => {
        if (this.host) this.host.style.display = 'none';
      }, 120);
    }
    this.visible = false;
  }

  isVisible() {
    return this.visible;
  }

  isLocked() {
    return this.locked;
  }

  setLocked(locked: boolean) {
    this.locked = locked;
    if (this.container) {
      this.container.classList.toggle('locked', locked);
    }
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
    if (this.host) {
      this.host.setAttribute('data-theme', theme);
    }
  }

  destroy() {
    if (this.host) {
      this.host.style.opacity = '0';
      this.host.style.transform = 'scale(0.96)';
      setTimeout(() => {
        this.host?.remove();
        this.host = null;
        this.shadow = null;
        this.container = null;
      }, 120);
    }
    this.visible = false;
  }

  private ensureHost() {
    if (this.host) return;

    this.host = document.createElement('snapcss-panel');
    this.host.setAttribute('data-snapcss', '');
    this.host.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      display: none;
      font-size: 12px;
      opacity: 0;
      transform: scale(0.96);
      transition: opacity 0.12s ease, transform 0.12s ease;
    `;

    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.injectStyles();

    this.container = document.createElement('div');
    this.container.className = 'panel';
    this.shadow.appendChild(this.container);

    document.documentElement.appendChild(this.host);
    this.host.setAttribute('data-theme', this.currentTheme);
    this.setupDrag();
  }

  private injectStyles() {
    if (!this.shadow) return;
    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    this.shadow.appendChild(style);
  }

  private render(info: ElementInfo, parsed: ParsedCSS, formattedCSS: string) {
    if (!this.container) return;

    const classStr = info.classList.length > 0
      ? info.classList.map(c => `<span class="cls">.${c}</span>`).join('')
      : '';
    const idStr = info.id ? `<span class="id">#${info.id}</span>` : '';

    let categoryHTML = '';
    const grouped = groupByCategory(parsed.styles);
    for (const [category, props] of grouped) {
      categoryHTML += `
        <div class="cat-group">
          <div class="cat-label">${categoryLabel(category)}</div>
          ${props.map(p => propRowHTML(p)).join('')}
        </div>
      `;
    }

    let pseudoHTML = '';
    for (const pe of parsed.pseudoElements) {
      pseudoHTML += `
        <div class="pseudo-section">
          <div class="pseudo-label">${pe.pseudo}</div>
          <div class="prop-row" data-copy="content: ${pe.content};">
            <span class="prop-name">content</span>
            <span class="prop-sep">:</span>
            <span class="prop-value">${pe.content}</span>
          </div>
          ${pe.styles.map(p => propRowHTML(p)).join('')}
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="panel-header" data-drag>
        <div class="selector-row">
          <span class="tag">${info.tagName}</span>${idStr}${classStr}
        </div>
        <div class="header-actions">
          <div class="dimensions">${info.width} × ${info.height}</div>
          <button class="close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="font-section">
          <div class="section-label">${t('panelFontInfo')}</div>
          <div class="font-grid">
            <span class="font-label">family</span><span class="font-val">${parsed.font.family}</span>
            <span class="font-label">size</span><span class="font-val">${parsed.font.size}</span>
            <span class="font-label">weight</span><span class="font-val">${parsed.font.weight}</span>
            <span class="font-label">color</span><span class="font-val">${colorSwatchClickable(parsed.font.color)}${parsed.font.color}</span>
            <span class="font-label">line-height</span><span class="font-val">${parsed.font.lineHeight}</span>
          </div>
        </div>
        <div class="styles-section">
          <div class="section-label">
            ${t('panelStyles')}
            <span class="computed-badge">${t('panelComputed')}</span>
            <span class="prop-count">${parsed.styles.length}</span>
          </div>
          ${this.buildPseudoClassHTML(parsed.pseudoClasses)}
          ${pseudoHTML}
          ${categoryHTML}
        </div>
      </div>
      <div class="panel-footer">
        <button class="copy-btn" data-action="copy-all">
          ${t('panelCopyAll')}
        </button>
        <div class="shortcut-bar">
          <span><kbd>Space</kbd> ${t('hintLock')}</span>
          <span><kbd>Shift</kbd> ${t('hintPause')}</span>
          <span><kbd>↑↓←→</kbd> ${t('hintNav')}</span>
        </div>
      </div>
      <div class="copy-toast"></div>
    `;

    this.bindEvents(formattedCSS);
  }

  private buildPseudoClassHTML(pseudoClasses: PseudoClassStyles[]): string {
    if (!pseudoClasses.length) return '';
    let html = '';
    for (const pc of pseudoClasses) {
      html += `
        <div class="pseudo-section pseudo-class-section">
          <div class="pseudo-class-label">${pc.pseudo}</div>
          ${pc.styles.map(p => propRowHTML(p)).join('')}
        </div>
      `;
    }
    return html;
  }

  private bindEvents(formattedCSS: string) {
    if (!this.container || !this.shadow) return;

    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onClose) {
        this.onClose();
      } else {
        this.hide();
      }
    });

    // Copy all CSS
    const copyAllBtn = this.container.querySelector('[data-action="copy-all"]');
    copyAllBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onCopy) this.onCopy(formattedCSS);
      this.flashCopyToast(t('copied'));
      const btn = copyAllBtn as HTMLButtonElement;
      btn.textContent = t('copied');
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = t('panelCopyAll');
        btn.classList.remove('copied');
      }, 1500);
    });

    // Click property row to copy
    this.container.querySelectorAll('.prop-row[data-copy]').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = (row as HTMLElement).getAttribute('data-copy') || '';
        if (this.onCopy) this.onCopy(text);
        this.flashCopyToast(t('copied'));
        (row as HTMLElement).classList.add('flash');
        setTimeout(() => (row as HTMLElement).classList.remove('flash'), 400);
      });
    });

    // Click color swatch to copy
    this.container.querySelectorAll('.color-swatch-btn').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const color = (swatch as HTMLElement).getAttribute('data-color') || '';
        if (this.onCopy) this.onCopy(color);
        this.flashCopyToast(color);
      });
    });
  }

  private flashCopyToast(msg: string) {
    if (!this.container) return;
    const toast = this.container.querySelector('.copy-toast') as HTMLElement;
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1200);
  }

  private position(rect: DOMRect) {
    if (!this.host) return;
    const gap = 10;

    let left = rect.right + gap;
    let top = rect.top;

    if (left + PANEL_WIDTH > window.innerWidth - 8) {
      left = rect.left - PANEL_WIDTH - gap;
    }
    if (left < 8) {
      left = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8);
    }

    if (top + PANEL_MAX_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - PANEL_MAX_HEIGHT - 8);
    }
    if (top < 8) top = 8;

    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
    this.host.style.display = 'block';

    requestAnimationFrame(() => {
      if (this.host) {
        this.host.style.opacity = '1';
        this.host.style.transform = 'scale(1)';
      }
    });
  }

  private setupDrag() {
    if (!this.shadow || !this.host) return;

    this.shadow.addEventListener('mousedown', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-drag]')) return;
      if (target.closest('.close-btn')) return;
      e.preventDefault();
      e.stopPropagation();

      this.dragging = true;
      const rect = this.host!.getBoundingClientRect();
      const me = e as MouseEvent;
      this.dragOffset = { x: me.clientX - rect.left, y: me.clientY - rect.top };

      const onMove = (ev: MouseEvent) => {
        if (!this.dragging || !this.host) return;
        this.host.style.left = `${ev.clientX - this.dragOffset.x}px`;
        this.host.style.top = `${ev.clientY - this.dragOffset.y}px`;
      };

      const onUp = () => {
        this.dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    this.shadow.addEventListener('click', (e: Event) => {
      e.stopPropagation();
    });
  }
}

// --- Helpers ---

function propRowHTML(p: CSSProperty): string {
  const copyText = `${p.name}: ${p.value};`;
  return `
    <div class="prop-row" data-copy="${escapeAttr(copyText)}" title="Click to copy">
      <span class="prop-name">${p.name}</span>
      <span class="prop-sep">:</span>
      <span class="prop-value ${isColorValue(p) ? 'has-color' : ''}">${formatValue(p)}</span>
    </div>
  `;
}

function groupByCategory(props: CSSProperty[]): Map<PropertyCategory, CSSProperty[]> {
  const map = new Map<PropertyCategory, CSSProperty[]>();
  for (const p of props) {
    const existing = map.get(p.category);
    if (existing) {
      existing.push(p);
    } else {
      map.set(p.category, [p]);
    }
  }
  return map;
}

const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  layout: 'Layout',
  sizing: 'Sizing',
  spacing: 'Spacing',
  typography: 'Typography',
  background: 'Background',
  border: 'Border',
  effects: 'Effects',
  other: 'Other',
};

function categoryLabel(cat: PropertyCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function isColorValue(p: CSSProperty): boolean {
  return (
    p.name === 'color' ||
    p.name.includes('color') ||
    p.name === 'background-color' ||
    (p.value.startsWith('rgb') || p.value.startsWith('#'))
  );
}

function colorSwatchClickable(color: string): string {
  return `<span class="color-swatch-btn" data-color="${escapeAttr(color)}" style="background:${color}" title="Click to copy color"></span>`;
}

function formatValue(p: CSSProperty): string {
  if (isColorValue(p)) {
    return `${colorSwatchClickable(p.value)}${p.value}`;
  }
  return p.value;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Panel CSS ---

const PANEL_CSS = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.5;

    --sc-bg: #ffffff;
    --sc-bg2: #f8f9fa;
    --sc-text: #1e1e2e;
    --sc-text2: #9ca3af;
    --sc-text3: #d1d5db;
    --sc-border: #e5e7eb;
    --sc-border2: #f3f4f6;
    --sc-shadow1: rgba(0,0,0,0.12);
    --sc-shadow2: rgba(0,0,0,0.08);
    --sc-badge-bg: #e5e7eb;
    --sc-badge-text: #6b7280;
    --sc-font-label: #9ca3af;
    --sc-font-val: #374151;
    --sc-prop-name: #2563eb;
    --sc-prop-sep: #d1d5db;
    --sc-prop-val: #16a34a;
    --sc-hover-bg: #f3f4f6;
    --sc-swatch-border: #d1d5db;
    --sc-scroll-thumb: #d1d5db;
    --sc-scroll-track: #ffffff;
    --sc-flash: rgba(99,102,241,0.12);
  }

  @media (prefers-color-scheme: dark) {
    :host(:not([data-theme="light"])) {
      --sc-bg: #1e1e2e;
      --sc-bg2: #181825;
      --sc-text: #cdd6f4;
      --sc-text2: #6c7086;
      --sc-text3: #585b70;
      --sc-border: #313244;
      --sc-border2: #313244;
      --sc-shadow1: rgba(0,0,0,0.4);
      --sc-shadow2: rgba(0,0,0,0.3);
      --sc-badge-bg: #313244;
      --sc-badge-text: #a6adc8;
      --sc-font-label: #585b70;
      --sc-font-val: #cdd6f4;
      --sc-prop-name: #89b4fa;
      --sc-prop-sep: #585b70;
      --sc-prop-val: #a6e3a1;
      --sc-hover-bg: #11111b;
      --sc-swatch-border: #45475a;
      --sc-scroll-thumb: #45475a;
      --sc-scroll-track: #1e1e2e;
      --sc-flash: rgba(137,180,250,0.15);
    }
  }

  :host([data-theme="dark"]) {
    --sc-bg: #1e1e2e;
    --sc-bg2: #181825;
    --sc-text: #cdd6f4;
    --sc-text2: #6c7086;
    --sc-text3: #585b70;
    --sc-border: #313244;
    --sc-border2: #313244;
    --sc-shadow1: rgba(0,0,0,0.4);
    --sc-shadow2: rgba(0,0,0,0.3);
    --sc-badge-bg: #313244;
    --sc-badge-text: #a6adc8;
    --sc-font-label: #585b70;
    --sc-font-val: #cdd6f4;
    --sc-prop-name: #89b4fa;
    --sc-prop-sep: #585b70;
    --sc-prop-val: #a6e3a1;
    --sc-hover-bg: #11111b;
    --sc-swatch-border: #45475a;
    --sc-scroll-thumb: #45475a;
    --sc-scroll-track: #1e1e2e;
    --sc-flash: rgba(137,180,250,0.15);
  }

  .panel {
    width: ${PANEL_WIDTH}px;
    max-height: ${PANEL_MAX_HEIGHT}px;
    display: flex;
    flex-direction: column;
    background: var(--sc-bg);
    color: var(--sc-text);
    border: 1px solid var(--sc-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px var(--sc-shadow1), 0 2px 8px var(--sc-shadow2);
    overflow: hidden;
  }

  .panel.locked {
    border-color: #6366f1;
    box-shadow: 0 0 0 1px #6366f1, 0 8px 32px var(--sc-shadow1);
  }

  .panel-header {
    padding: 6px 8px 6px 12px;
    background: var(--sc-bg2);
    border-bottom: 1px solid var(--sc-border);
    cursor: grab;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
  }
  .panel-header:active { cursor: grabbing; }

  .selector-row {
    display: flex;
    align-items: center;
    gap: 1px;
    flex-wrap: wrap;
    min-width: 0;
    overflow: hidden;
    flex: 1;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .close-btn {
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: var(--sc-text2);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.1s;
  }
  .close-btn:hover {
    background: var(--sc-hover-bg);
    color: var(--sc-text);
  }

  .tag { color: #818cf8; font-weight: 600; }
  .id { color: #f59e0b; }
  .cls { color: #34d399; }
  .dimensions {
    color: var(--sc-text2);
    font-size: 11px;
    white-space: nowrap;
  }

  .panel-body {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--sc-scroll-thumb) var(--sc-scroll-track);
  }

  .section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sc-text2);
    padding: 8px 12px 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .computed-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--sc-badge-bg);
    color: var(--sc-badge-text);
    font-weight: 500;
    text-transform: uppercase;
  }

  .prop-count {
    margin-left: auto;
    font-size: 10px;
    color: var(--sc-text3);
  }

  .font-section {
    padding: 4px 0;
    border-bottom: 1px solid var(--sc-border2);
  }

  .font-grid {
    display: grid;
    grid-template-columns: 80px 1fr;
    padding: 0 12px 6px;
    gap: 2px 8px;
    font-size: 11px;
  }
  .font-label { color: var(--sc-font-label); }
  .font-val {
    color: var(--sc-font-val);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .styles-section { padding-bottom: 4px; }
  .cat-group { padding: 0 0 2px; }

  .cat-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--sc-text3);
    padding: 4px 12px 2px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .prop-row {
    display: flex;
    align-items: baseline;
    padding: 1px 12px;
    font-size: 11px;
    font-family: "SF Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
    gap: 4px;
    line-height: 1.6;
    cursor: pointer;
    transition: background 0.1s;
    border-radius: 2px;
  }
  .prop-row:hover { background: var(--sc-hover-bg); }
  .prop-row.flash {
    background: var(--sc-flash);
    transition: none;
  }
  .prop-name { color: var(--sc-prop-name); white-space: nowrap; }
  .prop-sep { color: var(--sc-prop-sep); }
  .prop-value {
    color: var(--sc-prop-val);
    word-break: break-all;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .color-swatch-btn {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    border: 1px solid var(--sc-swatch-border);
    flex-shrink: 0;
    vertical-align: middle;
    cursor: pointer;
    transition: transform 0.1s;
  }
  .color-swatch-btn:hover {
    transform: scale(1.3);
    box-shadow: 0 0 0 2px rgba(99,102,241,0.3);
  }

  .pseudo-section {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--sc-border);
  }
  .pseudo-label {
    font-size: 10px;
    font-weight: 600;
    color: #e879f9;
    padding: 2px 12px;
  }
  .pseudo-class-label {
    font-size: 10px;
    font-weight: 600;
    color: #f59e0b;
    padding: 2px 12px;
  }

  .panel-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--sc-border);
    background: var(--sc-bg2);
  }

  .copy-btn {
    width: 100%;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    background: #6366f1;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .copy-btn:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }
  .copy-btn:active { transform: translateY(0); }
  .copy-btn.copied { background: #22c55e; }

  .shortcut-bar {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 6px;
    font-size: 9px;
    color: var(--sc-text2);
  }
  .shortcut-bar kbd {
    display: inline-block;
    padding: 0 3px;
    font-family: inherit;
    font-size: 9px;
    background: var(--sc-bg);
    border: 1px solid var(--sc-border);
    border-radius: 2px;
    line-height: 1.4;
  }

  .copy-toast {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    background: rgba(30, 30, 50, 0.92);
    color: #fff;
    padding: 4px 14px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s, transform 0.15s;
    z-index: 10;
    white-space: nowrap;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .copy-toast.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;
