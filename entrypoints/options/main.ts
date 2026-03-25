import { STORAGE_KEYS } from '@/lib/constants';
import { t, applyI18n, setLanguage } from '@/lib/i18n';
import type { CopyFormat, Theme, Language } from '@/lib/constants';

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

applyI18n();
loadSettings();
