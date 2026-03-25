import { MSG, STORAGE_KEYS } from '@/lib/constants';
import type { Message, ExtensionState, CopyFormat, Theme, Language } from '@/lib/constants';
import { Inspector } from '@/lib/inspector';
import { extractCSS, formatCSS, clearCaches } from '@/lib/css-parser';
import { Panel } from '@/lib/panel';
import { copyToClipboard } from '@/lib/copy';
import { t, setLanguage } from '@/lib/i18n';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    let copyFormat: CopyFormat = 'css';
    let theme: Theme = 'system';
    let activePanel: Panel | null = null;
    let lockedPanels: Panel[] = [];
    let toast: HTMLElement | null = null;

    const MAX_LOCKED_PANELS = 5;

    async function loadSettings() {
      try {
        const result = await chrome.storage.sync.get([
          STORAGE_KEYS.COPY_FORMAT,
          STORAGE_KEYS.THEME,
          STORAGE_KEYS.LANGUAGE,
        ]);
        copyFormat = result[STORAGE_KEYS.COPY_FORMAT] || 'css';
        theme = result[STORAGE_KEYS.THEME] || 'system';
        const lang = (result[STORAGE_KEYS.LANGUAGE] || 'auto') as Language;
        setLanguage(lang);
        applyThemeToAll();
      } catch {
        copyFormat = 'css';
        theme = 'system';
      }
    }

    function applyThemeToAll() {
      activePanel?.setTheme(theme);
      inspector.setTheme(theme);
      for (const p of lockedPanels) p.setTheme(theme);
    }

    chrome.storage.onChanged.addListener((changes) => {
      if (changes[STORAGE_KEYS.COPY_FORMAT]) {
        copyFormat = changes[STORAGE_KEYS.COPY_FORMAT].newValue || 'css';
      }
      if (changes[STORAGE_KEYS.THEME]) {
        theme = changes[STORAGE_KEYS.THEME].newValue || 'system';
        applyThemeToAll();
      }
      if (changes[STORAGE_KEYS.LANGUAGE]) {
        setLanguage(changes[STORAGE_KEYS.LANGUAGE].newValue || 'auto');
      }
    });

    function showToast(message: string) {
      if (!toast) {
        toast = document.createElement('snapcss-toast');
        toast.setAttribute('data-snapcss', '');
        toast.style.cssText = `
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          z-index: 2147483647;
          background: rgba(30, 30, 50, 0.92);
          backdrop-filter: blur(8px);
          color: #fff;
          padding: 8px 20px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
          pointer-events: none;
        `;
        document.documentElement.appendChild(toast);
      }
      toast.textContent = message;

      requestAnimationFrame(() => {
        toast!.style.opacity = '1';
        toast!.style.transform = 'translateX(-50%) translateY(0)';
      });

      setTimeout(() => {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(-50%) translateY(20px)';
        }
      }, 1500);
    }

    async function handleCopy(css: string) {
      const ok = await copyToClipboard(css);
      showToast(ok ? t('copied') : 'Copy failed');
    }

    function createPanel(onClose?: () => void): Panel {
      const p = new Panel(handleCopy, onClose);
      p.setTheme(theme);
      return p;
    }

    function ensureActivePanel(): Panel {
      if (!activePanel) {
        activePanel = createPanel();
      }
      return activePanel;
    }

    function lockCurrentPanel(info: import('@/lib/inspector').ElementInfo) {
      if (!activePanel || !activePanel.isVisible()) return;
      if (lockedPanels.length >= MAX_LOCKED_PANELS) {
        showToast(t('maxPanelsReached'));
        return;
      }

      // Mark current panel as locked
      activePanel.setLocked(true);
      lockedPanels.push(activePanel);

      // Create a new active panel (will be shown on next select/navigate)
      activePanel = null;

      showToast(`${t('panelLocked')} (${lockedPanels.length}/${MAX_LOCKED_PANELS})`);
    }

    function removeLockedPanel(panel: Panel) {
      lockedPanels = lockedPanels.filter(p => p !== panel);
      panel.destroy();
    }

    function clearAllPanels() {
      activePanel?.hide();
      for (const p of lockedPanels) p.destroy();
      lockedPanels = [];
    }

    const inspector = new Inspector((event) => {
      if (event.type === 'select' || event.type === 'navigate') {
        try {
          const parsed = extractCSS(event.info.element);
          const formatted = formatCSS(parsed, copyFormat);
          const p = ensureActivePanel();
          p.show(event.info, parsed, formatted);
        } catch (err) {
          console.error('[SnapCSS] CSS extraction error:', err);
        }
      }

      if (event.type === 'lock') {
        lockCurrentPanel(event.info);
      }

      if (event.type === 'deactivate') {
        clearAllPanels();
        activePanel = null;
        clearCaches();
        try {
          chrome.runtime.sendMessage({
            type: MSG.TOGGLE_INSPECT,
            active: false,
          });
        } catch { /* extension context may be invalid */ }
      }
    });

    // --- Activation ---

    window.addEventListener('snapcss:activate', ((e: CustomEvent) => {
      if (e.detail?.active) {
        loadSettings();
        inspector.activate();
      } else {
        inspector.deactivate();
      }
    }) as EventListener);

    // --- Message handling ---

    chrome.runtime.onMessage.addListener(
      (message: Message, _sender, sendResponse) => {
        if (message.type === MSG.GET_STATE) {
          sendResponse({ active: inspector.isActive() } satisfies ExtensionState);
          return true;
        }

        if (message.type === MSG.TOGGLE_INSPECT) {
          const newState = message.active ?? !inspector.isActive();
          if (newState) {
            loadSettings();
            inspector.activate();
          } else {
            inspector.deactivate();
          }
          sendResponse({ active: inspector.isActive() } satisfies ExtensionState);
          return true;
        }
      },
    );

    loadSettings();
  },
});
