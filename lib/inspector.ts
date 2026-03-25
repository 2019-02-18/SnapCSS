import { t } from './i18n';

export interface ElementInfo {
  tagName: string;
  id: string;
  classList: string[];
  width: number;
  height: number;
  rect: DOMRect;
  element: Element;
  isIframe: boolean;
}

export type InspectorEvent =
  | { type: 'hover'; info: ElementInfo }
  | { type: 'select'; info: ElementInfo }
  | { type: 'navigate'; info: ElementInfo }
  | { type: 'lock'; info: ElementInfo }
  | { type: 'deactivate' };

type InspectorCallback = (event: InspectorEvent) => void;

const THROTTLE_MS = 16;

export class Inspector {
  private active = false;
  private paused = false;
  private currentElement: Element | null = null;
  private selectedElement: Element | null = null;
  private callback: InspectorCallback;
  private lastMoveTime = 0;
  private pendingRAF: number | null = null;

  // Shadow DOM host for all UI
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private overlay: HTMLElement | null = null;
  private overlayLabel: HTMLElement | null = null;
  private infoTag: HTMLElement | null = null;

  private handleMouseMove: (e: MouseEvent) => void;
  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleScroll: () => void;

  constructor(callback: InspectorCallback) {
    this.callback = callback;
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleClick = this.onClick.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleScroll = this.onScroll.bind(this);
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.paused = false;

    this.ensureUI();

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleScroll);

    document.documentElement.style.cursor = 'crosshair';
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.paused = false;
    this.currentElement = null;
    this.selectedElement = null;

    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleScroll);

    if (this.pendingRAF) {
      cancelAnimationFrame(this.pendingRAF);
      this.pendingRAF = null;
    }

    this.hideOverlay();
    this.hideInfoTag();
    document.documentElement.style.cursor = '';

    this.callback({ type: 'deactivate' });
  }

  isActive() {
    return this.active;
  }

  getSelectedElement() {
    return this.selectedElement;
  }

  setTheme(theme: string) {
    if (this.host) {
      this.host.setAttribute('data-theme', theme);
    }
  }

  private isOwnElement(el: Element | null): boolean {
    if (!el) return false;
    if (el === this.host) return true;
    const tag = (el as HTMLElement).tagName || '';
    if (tag === 'SNAPCSS-ROOT' || tag === 'SNAPCSS-PANEL' || tag === 'SNAPCSS-TOAST') return true;
    if ((el as HTMLElement).hasAttribute?.('data-snapcss')) return true;
    let parent = el.parentElement;
    while (parent) {
      if (parent === this.host) return true;
      if ((parent as HTMLElement).hasAttribute?.('data-snapcss')) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  private isSkippedElement(el: Element): boolean {
    const tag = el.tagName?.toLowerCase();
    return !tag || ['html', 'head', 'script', 'style', 'link', 'meta', 'title', 'noscript', 'br', 'wbr'].includes(tag);
  }

  // --- UI Setup (Shadow DOM) ---

  private ensureUI() {
    if (this.host) return;

    this.host = document.createElement('snapcss-root');
    this.host.setAttribute('data-snapcss', '');
    this.host.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:0!important;height:0!important;overflow:visible!important;z-index:2147483647!important;pointer-events:none!important;';

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      #overlay {
        position: fixed;
        pointer-events: none;
        border: 2px solid #6366f1;
        background: rgba(99, 102, 241, 0.06);
        border-radius: 2px;
        z-index: 1;
        display: none;
        top: 0; left: 0; width: 0; height: 0;
      }
      #overlay.iframe-mask {
        background: rgba(99, 102, 241, 0.18);
      }
      #overlay-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        color: #fff;
        background: rgba(30, 30, 50, 0.85);
        padding: 6px 14px;
        border-radius: 6px;
        white-space: nowrap;
        display: none;
      }
      #infotag {
        position: fixed;
        pointer-events: none;
        z-index: 2;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
        font-size: 11px;
        line-height: 1.4;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        max-width: 420px;
        overflow: hidden;
        text-overflow: ellipsis;
        top: -9999px;
        left: -9999px;

        color: var(--si-text);
        background: var(--si-bg);
        box-shadow: var(--si-shadow);
        border: var(--si-border);
      }

      :host {
        --si-bg: rgba(30, 30, 50, 0.92);
        --si-text: #fff;
        --si-shadow: 0 2px 8px rgba(0,0,0,0.25);
        --si-border: none;
        --si-tag: #818cf8;
        --si-id: #f59e0b;
        --si-cls: #34d399;
        --si-extra: #9ca3af;
        --si-dim: #94a3b8;
      }

      :host([data-theme="light"]) {
        --si-bg: rgba(255, 255, 255, 0.96);
        --si-text: #1e1e2e;
        --si-shadow: 0 2px 8px rgba(0,0,0,0.12);
        --si-border: 1px solid rgba(0,0,0,0.08);
        --si-tag: #6366f1;
        --si-id: #d97706;
        --si-cls: #059669;
        --si-extra: #6b7280;
        --si-dim: #6b7280;
      }

      @media (prefers-color-scheme: light) {
        :host(:not([data-theme="dark"])) {
          --si-bg: rgba(255, 255, 255, 0.96);
          --si-text: #1e1e2e;
          --si-shadow: 0 2px 8px rgba(0,0,0,0.12);
          --si-border: 1px solid rgba(0,0,0,0.08);
          --si-tag: #6366f1;
          --si-id: #d97706;
          --si-cls: #059669;
          --si-extra: #6b7280;
          --si-dim: #6b7280;
        }
      }

      .tag { color: var(--si-tag); font-weight: 700; }
      .id { color: var(--si-id); }
      .cls { color: var(--si-cls); }
      .extra { color: var(--si-extra); }
      .dim { color: var(--si-dim); margin-left: 6px; }
    `;
    this.shadow.appendChild(style);

    this.overlay = document.createElement('div');
    this.overlay.id = 'overlay';
    this.overlayLabel = document.createElement('div');
    this.overlayLabel.id = 'overlay-label';
    this.overlay.appendChild(this.overlayLabel);
    this.shadow.appendChild(this.overlay);

    this.infoTag = document.createElement('div');
    this.infoTag.id = 'infotag';
    this.shadow.appendChild(this.infoTag);

    document.documentElement.appendChild(this.host);
  }

  // --- Mouse ---

  private onMouseMove(e: MouseEvent) {
    if (!this.active || this.paused) return;

    const now = performance.now();
    if (now - this.lastMoveTime < THROTTLE_MS) return;
    this.lastMoveTime = now;

    if (this.pendingRAF) cancelAnimationFrame(this.pendingRAF);

    const clientX = e.clientX;
    const clientY = e.clientY;
    const rawTarget = e.target as Element;

    this.pendingRAF = requestAnimationFrame(() => {
      this.pendingRAF = null;

      let target: Element | null = rawTarget;
      if (!target || this.isOwnElement(target)) {
        target = document.elementFromPoint(clientX, clientY);
      }
      if (!target || this.isOwnElement(target)) return;
      if (target === document.documentElement || target === document.body) return;
      if (this.isSkippedElement(target)) return;
      if (target === this.currentElement) return;

      this.currentElement = target;
      const info = this.buildElementInfo(target);
      this.positionOverlay(info.rect, info.isIframe ? t('iframeNotice') : undefined);
      this.positionInfoTag(info);
      this.callback({ type: 'hover', info });
    });
  }

  private onClick(e: MouseEvent) {
    if (!this.active) return;

    let target = e.target as Element | null;
    if (!target) return;

    if (this.isOwnElement(target)) {
      target = document.elementFromPoint(e.clientX, e.clientY);
    }
    if (!target || this.isOwnElement(target)) return;
    if (target === document.documentElement || target === document.body) return;
    if (this.isSkippedElement(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    this.selectedElement = target;
    this.currentElement = target;
    const info = this.buildElementInfo(target);
    this.positionOverlay(info.rect, info.isIframe ? t('iframeNotice') : undefined);
    this.positionInfoTag(info);
    this.callback({ type: 'select', info });
  }

  // --- Keyboard ---

  private onKeyDown(e: KeyboardEvent) {
    if (!this.active) return;

    if (e.key === 'Shift' && !e.repeat) {
      this.paused = !this.paused;
      document.documentElement.style.cursor = this.paused ? 'default' : 'crosshair';
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === 'Escape') {
      this.deactivate();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key === ' ' || e.code === 'Space') {
      const ref = this.selectedElement || this.currentElement;
      if (ref) {
        const info = this.buildElementInfo(ref);
        this.callback({ type: 'lock', info });
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
    if (!isArrow) return;

    const ref = this.selectedElement || this.currentElement;
    if (!ref) return;

    let next: Element | null = null;

    switch (e.key) {
      case 'ArrowUp':
        next = ref.parentElement;
        if (next === document.body || next === document.documentElement) next = null;
        break;
      case 'ArrowDown':
        next = this.getFirstVisibleChild(ref);
        break;
      case 'ArrowLeft':
        next = ref.previousElementSibling;
        break;
      case 'ArrowRight':
        next = ref.nextElementSibling;
        break;
    }

    if (!next || this.isOwnElement(next)) return;

    e.preventDefault();
    e.stopPropagation();

    this.currentElement = next;
    this.selectedElement = next;
    const info = this.buildElementInfo(next);
    this.positionOverlay(info.rect, info.isIframe ? t('iframeNotice') : undefined);
    this.positionInfoTag(info);

    const rect = next.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    this.callback({ type: 'navigate', info });
  }

  private getFirstVisibleChild(el: Element): Element | null {
    for (const child of el.children) {
      if (this.isOwnElement(child)) continue;
      const rect = child.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return child;
    }
    return null;
  }

  // --- Scroll ---

  private onScroll() {
    if (!this.active || !this.currentElement) return;
    if (this.pendingRAF) cancelAnimationFrame(this.pendingRAF);

    this.pendingRAF = requestAnimationFrame(() => {
      this.pendingRAF = null;
      if (!this.currentElement) return;
      const info = this.buildElementInfo(this.currentElement);
      this.positionOverlay(info.rect, info.isIframe ? t('iframeNotice') : undefined);
      this.positionInfoTag(info);
    });
  }

  // --- Element Info ---

  buildElementInfo(el: Element): ElementInfo {
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    return {
      tagName: tag,
      id: el.id || '',
      classList: Array.from(el.classList || []),
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      rect,
      element: el,
      isIframe: tag === 'iframe' || tag === 'frame',
    };
  }

  // --- Overlay ---

  private positionOverlay(rect: DOMRect, label?: string) {
    if (!this.overlay) return;
    const s = this.overlay.style;
    const minSize = 4;
    const w = Math.max(rect.width, minSize);
    const h = Math.max(rect.height, minSize);
    s.top = `${rect.top - (h - rect.height) / 2}px`;
    s.left = `${rect.left - (w - rect.width) / 2}px`;
    s.width = `${w}px`;
    s.height = `${h}px`;
    s.display = 'block';

    if (label && this.overlayLabel) {
      this.overlay.classList.add('iframe-mask');
      this.overlayLabel.textContent = label;
      this.overlayLabel.style.display = 'block';
    } else {
      this.overlay.classList.remove('iframe-mask');
      if (this.overlayLabel) this.overlayLabel.style.display = 'none';
    }
  }

  private hideOverlay() {
    if (this.overlay) this.overlay.style.display = 'none';
  }

  // --- Info Tag ---

  private positionInfoTag(info: ElementInfo) {
    if (!this.infoTag) return;

    let html = `<span class="tag">${info.tagName}</span>`;
    if (info.id) {
      html += `<span class="id">#${info.id}</span>`;
    }
    if (info.classList.length > 0) {
      const cls = info.classList.slice(0, 3).map(c => `.${c}`).join('');
      html += `<span class="cls">${cls}</span>`;
      if (info.classList.length > 3) {
        html += `<span class="extra">+${info.classList.length - 3}</span>`;
      }
    }
    html += `<span class="dim">${info.width} × ${info.height}</span>`;

    this.infoTag.innerHTML = html;
    this.infoTag.style.display = 'block';
    this.infoTag.style.top = '-9999px';
    this.infoTag.style.left = '0px';

    const tagRect = this.infoTag.getBoundingClientRect();
    const rect = info.rect;
    const gap = 6;

    let top = rect.top - tagRect.height - gap;
    let left = rect.left;

    if (top < 4) top = rect.bottom + gap;
    if (top + tagRect.height > window.innerHeight - 4) {
      top = Math.max(4, window.innerHeight - tagRect.height - 4);
    }
    if (left + tagRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tagRect.width - 4;
    }
    if (left < 4) left = 4;

    this.infoTag.style.top = `${top}px`;
    this.infoTag.style.left = `${left}px`;
  }

  private hideInfoTag() {
    if (this.infoTag) this.infoTag.style.display = 'none';
  }

  destroy() {
    this.deactivate();
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.overlay = null;
    this.overlayLabel = null;
    this.infoTag = null;
  }
}
