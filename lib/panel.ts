import type { ParsedCSS, CSSProperty, PropertyCategory, PseudoClassStyles } from './css-parser';
import type { ElementInfo } from './inspector';
import { t } from './i18n';
import { checkA11y } from './a11y-checker';
import type { A11yResult } from './a11y-checker';
import { initAIProviders, streamChat, loadAIConfig } from './ai';
import type { ChatMessage } from './ai';
import { buildMessages } from './ai/prompts';
import type { PromptAction } from './ai/prompts';

const PANEL_WIDTH = 340;
const PANEL_MAX_HEIGHT = 520;

type TabId = 'styles' | 'ai' | 'a11y';

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

  private activeTab: TabId = 'styles';
  private currentElement: Element | null = null;
  private currentSelector = '';
  private currentFormattedCSS = '';
  private currentParsed: ParsedCSS | null = null;
  private currentInfo: ElementInfo | null = null;
  private aiMessages: ChatMessage[] = [];
  private aiStreaming = false;
  private aiProvidersReady = false;

  constructor(onCopy?: (css: string) => void, onClose?: () => void) {
    this.onCopy = onCopy ?? null;
    this.onClose = onClose ?? null;
  }

  show(info: ElementInfo, parsed: ParsedCSS, formattedCSS: string) {
    this.ensureHost();
    this.currentElement = info.element;
    this.currentSelector = parsed.selector;
    this.currentFormattedCSS = formattedCSS;
    this.currentParsed = parsed;
    this.currentInfo = info;
    this.aiMessages = [];
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

  isVisible() { return this.visible; }
  isLocked() { return this.locked; }

  setLocked(locked: boolean) {
    this.locked = locked;
    if (this.container) this.container.classList.toggle('locked', locked);
  }

  setTheme(theme: string) {
    this.currentTheme = theme;
    if (this.host) this.host.setAttribute('data-theme', theme);
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
      <div class="tab-bar">
        <button class="tab-btn${this.activeTab === 'styles' ? ' active' : ''}" data-tab="styles">${t('panelStyles')}</button>
        <button class="tab-btn${this.activeTab === 'ai' ? ' active' : ''}" data-tab="ai">AI</button>
        <button class="tab-btn${this.activeTab === 'a11y' ? ' active' : ''}" data-tab="a11y">A11y</button>
      </div>
      <div class="tab-content" data-tab-content="styles" style="${this.activeTab !== 'styles' ? 'display:none' : ''}">
        ${this.buildStylesTab(info, parsed)}
      </div>
      <div class="tab-content" data-tab-content="ai" style="${this.activeTab !== 'ai' ? 'display:none' : ''}">
        ${this.buildAITab()}
      </div>
      <div class="tab-content" data-tab-content="a11y" style="${this.activeTab !== 'a11y' ? 'display:none' : ''}">
        ${this.buildA11yTab()}
      </div>
      <div class="panel-footer">
        <button class="copy-btn" data-action="copy-all">${t('panelCopyAll')}</button>
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

  private buildStylesTab(info: ElementInfo, parsed: ParsedCSS): string {
    let categoryHTML = '';
    const grouped = groupByCategory(parsed.styles);
    for (const [category, props] of grouped) {
      categoryHTML += `
        <div class="cat-group">
          <div class="cat-label">${categoryLabel(category)}</div>
          ${props.map(p => propRowHTML(p)).join('')}
        </div>`;
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
        </div>`;
    }

    return `
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
      </div>`;
  }

  private buildPseudoClassHTML(pseudoClasses: PseudoClassStyles[]): string {
    if (!pseudoClasses.length) return '';
    let html = '';
    for (const pc of pseudoClasses) {
      html += `
        <div class="pseudo-section pseudo-class-section">
          <div class="pseudo-class-label">${pc.pseudo}</div>
          ${pc.styles.map(p => propRowHTML(p)).join('')}
        </div>`;
    }
    return html;
  }

  private buildAITab(): string {
    return `
      <div class="panel-body ai-body">
        <div class="ai-actions">
          <button class="ai-action-btn" data-ai-action="explain">${t('aiExplain')}</button>
          <button class="ai-action-btn" data-ai-action="optimize">${t('aiOptimize')}</button>
          <button class="ai-action-btn" data-ai-action="responsive">${t('aiResponsive')}</button>
        </div>
        <div class="ai-chat-area" id="ai-chat-area">
          <div class="ai-placeholder">${t('aiPlaceholder')}</div>
        </div>
        <div class="ai-input-area">
          <input class="ai-input" type="text" placeholder="${t('aiInputPlaceholder')}" />
          <button class="ai-send-btn" data-ai-action="chat">${t('aiSend')}</button>
        </div>
      </div>`;
  }

  private buildA11yTab(): string {
    if (!this.currentElement) {
      return `<div class="panel-body"><div class="a11y-placeholder">${t('a11yNoElement')}</div></div>`;
    }

    let result: A11yResult;
    try {
      result = checkA11y(this.currentElement);
    } catch {
      return `<div class="panel-body"><div class="a11y-placeholder">${t('a11yError')}</div></div>`;
    }

    const c = result.contrast;
    const f = result.fontSize;

    const ratioClass = c.aa ? (c.aaa ? 'pass-aaa' : 'pass-aa') : 'fail';
    const ratioBg = c.aa ? (c.aaa ? '#22c55e' : '#f59e0b') : '#ef4444';

    return `
      <div class="panel-body a11y-body">
        <div class="a11y-section">
          <div class="section-label">${t('a11yContrast')}</div>
          <div class="a11y-ratio-display ${ratioClass}">
            <div class="a11y-ratio-value" style="background:${ratioBg}">${c.ratio}:1</div>
            <div class="a11y-badges">
              <span class="a11y-badge ${c.aa ? 'pass' : 'fail'}">AA ${c.aa ? '✓' : '✗'}</span>
              <span class="a11y-badge ${c.aaa ? 'pass' : 'fail'}">AAA ${c.aaa ? '✓' : '✗'}</span>
            </div>
          </div>
          <div class="a11y-colors">
            <div class="a11y-color-row">
              <span class="a11y-color-label">${t('a11yForeground')}</span>
              <span class="color-swatch-btn" style="background:${c.foreground}" data-color="${escapeAttr(c.foreground)}"></span>
              <span class="a11y-color-val">${c.foreground}</span>
            </div>
            <div class="a11y-color-row">
              <span class="a11y-color-label">${t('a11yBackground')}</span>
              <span class="color-swatch-btn" style="background:${c.background}" data-color="${escapeAttr(c.background)}"></span>
              <span class="a11y-color-val">${c.background}</span>
            </div>
          </div>
          <div class="a11y-preview" style="color:${c.foreground};background:${c.background};padding:8px 12px;border-radius:4px;font-size:14px;margin-top:6px;">
            ${t('a11yPreviewText')}
          </div>
        </div>
        <div class="a11y-section">
          <div class="section-label">${t('a11yFontSize')}</div>
          <div class="a11y-font-info">
            <div class="a11y-font-row">
              <span>${t('a11yFontSizeValue')}</span>
              <span class="a11y-font-val">${f.value} (${f.px}px)</span>
            </div>
            <div class="a11y-font-row">
              <span>${t('a11yLargeText')}</span>
              <span class="a11y-badge ${f.isLargeText ? 'pass' : 'neutral'}">${f.isLargeText ? t('a11yYes') : t('a11yNo')}</span>
            </div>
            <div class="a11y-font-row">
              <span>${t('a11yReadable')}</span>
              <span class="a11y-badge ${f.readable ? 'pass' : 'fail'}">${f.readable ? '✓' : '✗'} ${f.readable ? t('a11yYes') : t('a11yNo')}</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  private bindEvents(formattedCSS: string) {
    if (!this.container || !this.shadow) return;

    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onClose) this.onClose();
      else this.hide();
    });

    // Tab switching
    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tab = (btn as HTMLElement).getAttribute('data-tab') as TabId;
        this.switchTab(tab);
      });
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
      setTimeout(() => { btn.textContent = t('panelCopyAll'); btn.classList.remove('copied'); }, 1500);
    });

    // Property row copy
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

    // Color swatch copy
    this.container.querySelectorAll('.color-swatch-btn').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const color = (swatch as HTMLElement).getAttribute('data-color') || '';
        if (this.onCopy) this.onCopy(color);
        this.flashCopyToast(color);
      });
    });

    // AI action buttons
    this.container.querySelectorAll('[data-ai-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).getAttribute('data-ai-action') as PromptAction;
        if (action === 'chat') {
          const input = this.container?.querySelector('.ai-input') as HTMLInputElement;
          if (input?.value.trim()) {
            this.handleAIAction('chat', input.value.trim());
            input.value = '';
          }
        } else {
          this.handleAIAction(action);
        }
      });
    });

    // Code block copy buttons (delegated)
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('md-copy-btn')) {
        e.stopPropagation();
        const code = target.getAttribute('data-copy-code') || '';
        if (this.onCopy) this.onCopy(code);
        target.textContent = t('copied');
        target.classList.add('copied');
        setTimeout(() => { target.textContent = 'Copy'; target.classList.remove('copied'); }, 1500);
      }
    });

    // AI input enter key
    const aiInput = this.container.querySelector('.ai-input') as HTMLInputElement;
    aiInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && aiInput.value.trim()) {
        e.preventDefault();
        e.stopPropagation();
        this.handleAIAction('chat', aiInput.value.trim());
        aiInput.value = '';
      }
    });
    aiInput?.addEventListener('keyup', (e) => e.stopPropagation());
    aiInput?.addEventListener('keypress', (e) => e.stopPropagation());
  }

  private switchTab(tab: TabId) {
    if (!this.container) return;
    this.activeTab = tab;

    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).getAttribute('data-tab') === tab);
    });

    this.container.querySelectorAll('.tab-content').forEach((el) => {
      const tc = el as HTMLElement;
      tc.style.display = tc.getAttribute('data-tab-content') === tab ? '' : 'none';
    });
  }

  private async handleAIAction(action: PromptAction, userMessage?: string) {
    if (this.aiStreaming) return;

    if (!this.aiProvidersReady) {
      initAIProviders();
      this.aiProvidersReady = true;
    }

    const config = await loadAIConfig();
    if (!config?.apiKey) {
      this.showAIMessage('system', t('aiNotConfigured'));
      return;
    }

    const chatArea = this.container?.querySelector('#ai-chat-area') as HTMLElement;
    if (!chatArea) return;

    // Remove placeholder
    const placeholder = chatArea.querySelector('.ai-placeholder');
    if (placeholder) placeholder.remove();

    // Show user action
    const label = action === 'chat' ? userMessage || '' : t(`ai${capitalize(action)}` as any);
    this.appendChatBubble(chatArea, 'user', label);

    const messages = buildMessages(action, this.currentSelector, this.currentFormattedCSS, userMessage);

    this.aiStreaming = true;
    this.setAIButtonsEnabled(false);

    const assistantBubble = this.appendChatBubble(chatArea, 'assistant', '');
    const contentEl = assistantBubble.querySelector('.ai-bubble-content') as HTMLElement;

    let fullText = '';
    try {
      for await (const chunk of streamChat(messages)) {
        fullText += chunk;
        contentEl.innerHTML = renderMarkdown(fullText);
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      contentEl.innerHTML = `<span class="ai-error">${escapeHtml(errMsg)}</span>`;
    } finally {
      this.aiStreaming = false;
      this.setAIButtonsEnabled(true);
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  private showAIMessage(role: string, text: string) {
    const chatArea = this.container?.querySelector('#ai-chat-area') as HTMLElement;
    if (!chatArea) return;
    const placeholder = chatArea.querySelector('.ai-placeholder');
    if (placeholder) placeholder.remove();
    this.appendChatBubble(chatArea, role, text);
  }

  private appendChatBubble(chatArea: HTMLElement, role: string, content: string): HTMLElement {
    const bubble = document.createElement('div');
    bubble.className = `ai-bubble ai-bubble-${role}`;
    bubble.innerHTML = `<div class="ai-bubble-content">${role === 'assistant' ? renderMarkdown(content) : escapeHtml(content)}</div>`;
    chatArea.appendChild(bubble);
    chatArea.scrollTop = chatArea.scrollHeight;
    return bubble;
  }

  private setAIButtonsEnabled(enabled: boolean) {
    this.container?.querySelectorAll('.ai-action-btn, .ai-send-btn').forEach(btn => {
      (btn as HTMLButtonElement).disabled = !enabled;
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

    this.shadow.addEventListener('click', (e: Event) => { e.stopPropagation(); });
  }
}

// --- Helpers ---

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function propRowHTML(p: CSSProperty): string {
  const copyText = `${p.name}: ${p.value};`;
  return `
    <div class="prop-row" data-copy="${escapeAttr(copyText)}" title="Click to copy">
      <span class="prop-name">${p.name}</span>
      <span class="prop-sep">:</span>
      <span class="prop-value ${isColorValue(p) ? 'has-color' : ''}">${formatValue(p)}</span>
    </div>`;
}

function groupByCategory(props: CSSProperty[]): Map<PropertyCategory, CSSProperty[]> {
  const map = new Map<PropertyCategory, CSSProperty[]>();
  for (const p of props) {
    const existing = map.get(p.category);
    if (existing) existing.push(p);
    else map.set(p.category, [p]);
  }
  return map;
}

const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  layout: 'Layout', sizing: 'Sizing', spacing: 'Spacing',
  typography: 'Typography', background: 'Background', border: 'Border',
  effects: 'Effects', other: 'Other',
};

function categoryLabel(cat: PropertyCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function isColorValue(p: CSSProperty): boolean {
  return p.name === 'color' || p.name.includes('color') ||
    p.name === 'background-color' ||
    p.value.startsWith('rgb') || p.value.startsWith('#');
}

function colorSwatchClickable(color: string): string {
  return `<span class="color-swatch-btn" data-color="${escapeAttr(color)}" style="background:${color}" title="Click to copy color"></span>`;
}

function formatValue(p: CSSProperty): string {
  if (isColorValue(p)) return `${colorSwatchClickable(p.value)}${p.value}`;
  return p.value;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightCSS(code: string): string {
  return code
    // Comments
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
    // Selectors (lines ending with {)
    .replace(/^([^{:;/\n]+?)(\s*\{)/gm, '<span class="hl-selector">$1</span>$2')
    // Property: value pairs
    .replace(/(\s+)([\w-]+)(\s*:\s*)([^;]+)(;)/g,
      '$1<span class="hl-prop">$2</span><span class="hl-punct">$3</span><span class="hl-val">$4</span><span class="hl-punct">$5</span>')
    // Braces
    .replace(/([{}])/g, '<span class="hl-punct">$1</span>')
    // Numbers with units
    .replace(/\b(\d+(?:\.\d+)?)(px|rem|em|%|vw|vh|s|ms|deg)\b/g, '<span class="hl-num">$1$2</span>')
    // Colors (#hex)
    .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="hl-color">$1</span>');
}

function renderMarkdown(md: string): string {
  let html = escapeHtml(md);

  // Code blocks with copy button and syntax highlighting
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const trimmed = code.trim();
    const highlighted = (lang === 'css' || lang === '' || !lang)
      ? highlightCSS(trimmed)
      : trimmed;
    return `<div class="md-code-wrapper"><button class="md-copy-btn" data-copy-code="${escapeAttr(trimmed)}">Copy</button><pre class="md-code-block"><code class="lang-${lang || 'css'}">${highlighted}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h">$1</h2>');

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="md-list">$&</ul>');

  // Ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/<br\/>\s*<br\/>/g, '<br/>');

  return html;
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
    --sc-accent: #6366f1;
    --sc-accent-hover: #4f46e5;
    --sc-success: #22c55e;
    --sc-warning: #f59e0b;
    --sc-error: #ef4444;
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
      --sc-accent: #818cf8;
      --sc-accent-hover: #6366f1;
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
    --sc-accent: #818cf8;
    --sc-accent-hover: #6366f1;
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
    border-color: var(--sc-accent);
    box-shadow: 0 0 0 1px var(--sc-accent), 0 8px 32px var(--sc-shadow1);
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

  /* Tab bar */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--sc-border);
    background: var(--sc-bg2);
    padding: 0 4px;
    gap: 2px;
  }
  .tab-btn {
    flex: 1;
    padding: 6px 8px;
    border: none;
    background: transparent;
    color: var(--sc-text2);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .tab-btn:hover { color: var(--sc-text); }
  .tab-btn.active {
    color: var(--sc-accent);
    border-bottom-color: var(--sc-accent);
  }

  /* Tab content */
  .tab-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
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
  .prop-row.flash { background: var(--sc-flash); transition: none; }
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
    background: var(--sc-accent);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .copy-btn:hover {
    background: var(--sc-accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }
  .copy-btn:active { transform: translateY(0); }
  .copy-btn.copied { background: var(--sc-success); }

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

  /* === AI Tab === */
  .ai-body {
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }
  .ai-actions {
    display: flex;
    gap: 4px;
    padding: 8px;
    flex-wrap: wrap;
  }
  .ai-action-btn {
    flex: 1;
    min-width: 70px;
    padding: 5px 8px;
    border: 1px solid var(--sc-border);
    border-radius: 6px;
    background: var(--sc-bg2);
    color: var(--sc-text);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ai-action-btn:hover {
    border-color: var(--sc-accent);
    color: var(--sc-accent);
    background: var(--sc-hover-bg);
  }
  .ai-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ai-chat-area {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
    min-height: 120px;
    max-height: 280px;
    scrollbar-width: thin;
    scrollbar-color: var(--sc-scroll-thumb) var(--sc-scroll-track);
    scroll-behavior: smooth;
    overscroll-behavior: contain;
  }
  .ai-placeholder {
    color: var(--sc-text3);
    font-size: 11px;
    text-align: center;
    padding: 32px 12px;
  }
  .ai-bubble {
    margin-bottom: 8px;
  }
  .ai-bubble-user {
    text-align: right;
  }
  .ai-bubble-user .ai-bubble-content {
    display: inline-block;
    background: var(--sc-accent);
    color: #fff;
    padding: 4px 10px;
    border-radius: 10px 10px 2px 10px;
    font-size: 11px;
    max-width: 90%;
    text-align: left;
  }
  .ai-bubble-assistant .ai-bubble-content,
  .ai-bubble-system .ai-bubble-content {
    background: var(--sc-bg2);
    border: 1px solid var(--sc-border);
    padding: 8px 10px;
    border-radius: 2px 10px 10px 10px;
    font-size: 11px;
    line-height: 1.6;
    overflow-x: auto;
  }
  .ai-bubble-system .ai-bubble-content {
    border-color: var(--sc-warning);
    background: rgba(245,158,11,0.08);
  }
  .ai-error { color: var(--sc-error); }
  .ai-input-area {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    border-top: 1px solid var(--sc-border);
  }
  .ai-input {
    flex: 1;
    padding: 5px 8px;
    border: 1px solid var(--sc-border);
    border-radius: 6px;
    background: var(--sc-bg);
    color: var(--sc-text);
    font-size: 11px;
    outline: none;
    transition: border-color 0.15s;
  }
  .ai-input:focus { border-color: var(--sc-accent); }
  .ai-send-btn {
    padding: 5px 10px;
    border: none;
    border-radius: 6px;
    background: var(--sc-accent);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .ai-send-btn:hover { background: var(--sc-accent-hover); }
  .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Markdown in AI */
  .md-code-wrapper {
    position: relative;
    margin: 4px 0;
  }
  .md-copy-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px 8px;
    border: 1px solid var(--sc-border);
    border-radius: 4px;
    background: var(--sc-bg);
    color: var(--sc-text2);
    font-size: 9px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s;
    z-index: 1;
  }
  .md-code-wrapper:hover .md-copy-btn { opacity: 1; }
  .md-copy-btn:hover {
    background: var(--sc-hover-bg);
    color: var(--sc-text);
  }
  .md-copy-btn.copied {
    background: var(--sc-success);
    color: #fff;
    border-color: var(--sc-success);
    opacity: 1;
  }
  .md-code-block {
    background: var(--sc-bg2);
    border: 1px solid var(--sc-border);
    border-radius: 4px;
    padding: 6px 8px;
    overflow-x: auto;
    font-family: "SF Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
    font-size: 10px;
    line-height: 1.5;
    white-space: pre;
  }
  .md-inline-code {
    background: var(--sc-badge-bg);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: "SF Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
    font-size: 10px;
  }
  .md-h {
    font-size: 12px;
    font-weight: 700;
    margin: 6px 0 2px;
  }
  .md-list {
    padding-left: 16px;
    margin: 2px 0;
  }
  .md-list li { margin-bottom: 1px; }

  /* Syntax highlighting */
  .hl-selector { color: #818cf8; font-weight: 600; }
  .hl-prop { color: var(--sc-prop-name); }
  .hl-val { color: var(--sc-prop-val); }
  .hl-punct { color: var(--sc-prop-sep); }
  .hl-num { color: #f59e0b; }
  .hl-color { color: #e879f9; }
  .hl-comment { color: var(--sc-text3); font-style: italic; }

  /* === A11y Tab === */
  .a11y-body {
    padding: 4px 0;
  }
  .a11y-section {
    padding: 0 12px 8px;
  }
  .a11y-section + .a11y-section {
    border-top: 1px solid var(--sc-border2);
    padding-top: 8px;
  }
  .a11y-placeholder {
    color: var(--sc-text3);
    font-size: 11px;
    text-align: center;
    padding: 32px 12px;
  }
  .a11y-ratio-display {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  .a11y-ratio-value {
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    min-width: 70px;
    text-align: center;
  }
  .a11y-badges {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .a11y-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .a11y-badge.pass {
    background: rgba(34,197,94,0.15);
    color: var(--sc-success);
  }
  .a11y-badge.fail {
    background: rgba(239,68,68,0.15);
    color: var(--sc-error);
  }
  .a11y-badge.neutral {
    background: var(--sc-badge-bg);
    color: var(--sc-badge-text);
  }
  .a11y-colors {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }
  .a11y-color-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }
  .a11y-color-label {
    color: var(--sc-text2);
    min-width: 60px;
  }
  .a11y-color-val {
    color: var(--sc-text);
    font-family: "SF Mono", Consolas, monospace;
    font-size: 10px;
  }
  .a11y-font-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0;
  }
  .a11y-font-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: var(--sc-text);
  }
  .a11y-font-val {
    font-family: "SF Mono", Consolas, monospace;
    font-size: 10px;
    color: var(--sc-text2);
  }
  .a11y-preview {
    font-family: inherit;
  }
`;
