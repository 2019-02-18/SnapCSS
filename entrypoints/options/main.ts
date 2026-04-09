import { STORAGE_KEYS } from '@/lib/constants';
import { t, applyI18n, setLanguage } from '@/lib/i18n';
import type { CopyFormat, Theme, Language } from '@/lib/constants';
import { initAIProviders, loadAIConfig, saveAIConfig, getProvider, DEFAULT_MODELS, DEFAULT_ENDPOINTS } from '@/lib/ai';
import type { AIProviderType } from '@/lib/ai';

const formatRadios = document.querySelectorAll<HTMLInputElement>(
  'input[name="copyFormat"]',
);
const themeSelect = document.getElementById(
  'theme-select',
) as HTMLSelectElement;
const langSelect = document.getElementById(
  'lang-select',
) as HTMLSelectElement;
const saveStatus = document.getElementById('save-status') as HTMLDivElement;

function showSaved() {
  saveStatus.textContent = t('settingsSaved');
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 1500);
}

function applyTheme(theme: string) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

async function loadSettings() {
  const result = await chrome.storage.sync.get([
    STORAGE_KEYS.COPY_FORMAT,
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.LANGUAGE,
  ]);

  const format: CopyFormat = result[STORAGE_KEYS.COPY_FORMAT] || 'css';
  const theme: Theme = result[STORAGE_KEYS.THEME] || 'system';
  const lang: Language = result[STORAGE_KEYS.LANGUAGE] || 'auto';

  formatRadios.forEach((radio) => {
    radio.checked = radio.value === format;
  });
  themeSelect.value = theme;
  applyTheme(theme);
  langSelect.value = lang;
  setLanguage(lang);
  applyI18n();
}

formatRadios.forEach((radio) => {
  radio.addEventListener('change', async () => {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.COPY_FORMAT]: radio.value as CopyFormat,
    });
    showSaved();
  });
});

themeSelect.addEventListener('change', async () => {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.THEME]: themeSelect.value as Theme,
  });
  applyTheme(themeSelect.value);
  showSaved();
});

langSelect.addEventListener('change', async () => {
  const lang = langSelect.value as Language;
  await chrome.storage.sync.set({
    [STORAGE_KEYS.LANGUAGE]: lang,
  });
  setLanguage(lang);
  applyI18n();
  showSaved();
});

const shortcutLink = document.getElementById('shortcut-link') as HTMLAnchorElement;
shortcutLink?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// --- AI Settings ---
initAIProviders();

const aiProvider = document.getElementById('ai-provider') as HTMLSelectElement;
const aiApiKey = document.getElementById('ai-api-key') as HTMLInputElement;
const aiEndpoint = document.getElementById('ai-endpoint') as HTMLInputElement;
const aiModel = document.getElementById('ai-model') as HTMLInputElement;
const aiKeyToggle = document.getElementById('ai-key-toggle') as HTMLButtonElement;
const aiTestBtn = document.getElementById('ai-test-btn') as HTMLButtonElement;
const aiSaveBtn = document.getElementById('ai-save-btn') as HTMLButtonElement;
const aiStatus = document.getElementById('ai-status') as HTMLDivElement;
const aiEndpointGroup = document.getElementById('ai-endpoint-group') as HTMLDivElement;

let lastAutoProvider: string | null = null;

function updateAIDefaults(autoFill = false) {
  const provider = aiProvider.value as AIProviderType;
  const defaultEndpoint = DEFAULT_ENDPOINTS[provider] || '';
  const defaultModel = DEFAULT_MODELS[provider] || '';

  aiEndpoint.placeholder = defaultEndpoint || 'https://...';
  aiModel.placeholder = defaultModel || 'model-name';

  if (autoFill && provider !== 'custom') {
    aiEndpoint.value = defaultEndpoint;
    aiModel.value = defaultModel;
  }

  lastAutoProvider = provider;
}

aiProvider.addEventListener('change', () => updateAIDefaults(true));

aiKeyToggle.addEventListener('click', () => {
  aiApiKey.type = aiApiKey.type === 'password' ? 'text' : 'password';
});

aiSaveBtn.addEventListener('click', async () => {
  await saveAIConfig({
    provider: aiProvider.value as AIProviderType,
    apiKey: aiApiKey.value.trim(),
    endpoint: aiEndpoint.value.trim() || undefined,
    model: aiModel.value.trim() || undefined,
  });
  aiStatus.textContent = t('settingsSaved');
  aiStatus.className = 'ai-status success';
  setTimeout(() => { aiStatus.textContent = ''; aiStatus.className = 'ai-status'; }, 2000);
});

aiTestBtn.addEventListener('click', async () => {
  const provider = getProvider(aiProvider.value);
  if (!provider) return;

  aiStatus.textContent = t('aiTesting');
  aiStatus.className = 'ai-status testing';
  aiTestBtn.disabled = true;

  try {
    const ok = await provider.testConnection({
      provider: aiProvider.value as AIProviderType,
      apiKey: aiApiKey.value.trim(),
      endpoint: aiEndpoint.value.trim() || undefined,
      model: aiModel.value.trim() || undefined,
    });
    aiStatus.textContent = ok ? t('aiTestSuccess') : t('aiTestFail');
    aiStatus.className = `ai-status ${ok ? 'success' : 'error'}`;
  } catch (err: any) {
    aiStatus.textContent = `${t('aiTestFail')}: ${err?.message || err}`;
    aiStatus.className = 'ai-status error';
  } finally {
    aiTestBtn.disabled = false;
  }
});

async function loadAISettings() {
  const config = await loadAIConfig();
  if (config) {
    aiProvider.value = config.provider;
    aiApiKey.value = config.apiKey || '';
    aiEndpoint.value = config.endpoint || '';
    aiModel.value = config.model || '';
  }
  updateAIDefaults(false);
}

loadAISettings();

// Quickstart links
const QUICKSTART_URLS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  deepseek: 'https://platform.deepseek.com/api_keys',
};

document.querySelectorAll('.ai-quickstart-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const provider = (link as HTMLElement).getAttribute('data-provider') || '';
    if (QUICKSTART_URLS[provider]) {
      chrome.tabs.create({ url: QUICKSTART_URLS[provider] });
    }
    aiProvider.value = provider;
    updateAIDefaults(true);
  });
});

applyI18n();
loadSettings();
