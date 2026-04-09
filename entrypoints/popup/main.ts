import { MSG, STORAGE_KEYS } from '@/lib/constants';
import { t, applyI18n, setLanguage } from '@/lib/i18n';
import type { ExtensionState, Language } from '@/lib/constants';
import { AI_STORAGE_KEY } from '@/lib/ai/service';

const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
const toggleIcon = document.getElementById('toggle-icon') as HTMLSpanElement;
const toggleLabel = document.getElementById('toggle-label') as HTMLSpanElement;
const optionsLink = document.getElementById('options-link') as HTMLAnchorElement;
const formatSelect = document.getElementById('format-select') as HTMLSelectElement;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
const langSelect = document.getElementById('lang-select') as HTMLSelectElement;

function updateUI(active: boolean) {
  toggleBtn.classList.toggle('active', active);
  toggleIcon.textContent = active ? '■' : '▶';
  toggleLabel.textContent = active ? t('stopInspecting') : t('startInspecting');
}

function applyTheme(theme: string) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function toggleInspect() {
  const tab = await getCurrentTab();
  if (!tab?.id) return;

  const isActive = toggleBtn.classList.contains('active');
  const newState = !isActive;

  try {
    await chrome.runtime.sendMessage({
      type: MSG.TOGGLE_INSPECT,
      active: newState,
      tabId: tab.id,
    });
  } catch {
    // Fallback: directly inject
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (active: boolean) => {
        window.dispatchEvent(
          new CustomEvent('snapcss:activate', { detail: { active } }),
        );
      },
      args: [newState],
    });
  }

  updateUI(newState);
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.COPY_FORMAT,
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.LANGUAGE,
    ]);
    formatSelect.value = result[STORAGE_KEYS.COPY_FORMAT] || 'css';
    const theme = result[STORAGE_KEYS.THEME] || 'system';
    themeSelect.value = theme;
    applyTheme(theme);
    const lang = (result[STORAGE_KEYS.LANGUAGE] || 'auto') as Language;
    langSelect.value = lang;
    setLanguage(lang);
    applyI18n();
  } catch {
    // Use defaults
  }
}

function setupSettingsListeners() {
  formatSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ [STORAGE_KEYS.COPY_FORMAT]: formatSelect.value });
  });

  themeSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: themeSelect.value });
    applyTheme(themeSelect.value);
  });

  langSelect.addEventListener('change', () => {
    const lang = langSelect.value as Language;
    chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: lang });
    setLanguage(lang);
    applyI18n();
    updateUI(toggleBtn.classList.contains('active'));
  });
}

async function checkAIStatus() {
  const badge = document.getElementById('ai-status-badge');
  const statusText = document.getElementById('ai-status-text');
  if (!badge || !statusText) return;

  try {
    const result = await chrome.storage.local.get(AI_STORAGE_KEY);
    const config = result[AI_STORAGE_KEY];
    if (config?.apiKey) {
      badge.classList.add('configured');
      statusText.textContent = `AI: ${config.provider || 'configured'}`;
    } else {
      badge.classList.remove('configured');
      statusText.textContent = t('aiNotReady');
    }
  } catch {
    // ignore
  }

  badge.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function initPopup() {
  applyI18n();
  await loadSettings();
  setupSettingsListeners();
  checkAIStatus();

  const manifest = chrome.runtime.getManifest();
  const versionEl = document.getElementById('version-label');
  if (versionEl) versionEl.textContent = `v${manifest.version}`;

  const tab = await getCurrentTab();
  if (!tab?.id) return;

  try {
    const response: ExtensionState = await chrome.runtime.sendMessage({
      type: MSG.GET_STATE,
      tabId: tab.id,
    });
    updateUI(response.active);
  } catch {
    updateUI(false);
  }
}

toggleBtn.addEventListener('click', toggleInspect);

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Listen for state changes from background (e.g. when shortcut is used while popup is open)
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === MSG.STATE_CHANGED) {
    const tab = await getCurrentTab();
    if (tab?.id === message.tabId) {
      updateUI(message.active);
    }
  }
});

initPopup();
