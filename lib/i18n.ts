const FALLBACK_ZH: Record<string, string> = {
  popupTagline: '悬停 · 查看 · 复制',
  startInspecting: '开始检查',
  stopInspecting: '停止检查',
  shortcutHintLabel: '快捷键：',
  copyFormat: '复制格式',
  formatCSS: '标准 CSS',
  formatCSSVars: 'CSS 变量',
  formatMinified: '压缩单行',
  theme: '主题',
  themeSystem: '跟随系统',
  themeLight: '浅色',
  themeDark: '深色',
  language: '语言',
  langAuto: '跟随系统',
  langEn: 'English',
  langZh: '中文',
  settings: '设置',
  settingsTitle: 'SnapCSS 设置',
  settingsSaved: '设置已保存',
  shortcutKey: '快捷键',
  shortcutKeyDesc: '当前快捷键：Alt + C。你可以在 Chrome 扩展快捷键设置中自定义。',
  shortcutKeyChange: '修改快捷键 →',
  contextMenuInspect: '用 SnapCSS 检查',
  toggleInspectDesc: '切换 SnapCSS 检查模式',
  panelFontInfo: '字体',
  panelSize: '尺寸',
  panelStyles: '样式',
  panelComputed: '计算值',
  panelCopyAll: '复制全部 CSS',
  copied: '已复制！',
  panelLocked: '面板已锁定',
  maxPanelsReached: '已达最大锁定数量',
  hintLock: '锁定',
  hintPause: '暂停',
  hintNav: '导航',
  iframeNotice: 'iframe 内部元素无法检查（跨域限制）',
};

const FALLBACK_EN: Record<string, string> = {
  popupTagline: 'Hover. See. Copy.',
  startInspecting: 'Start Inspecting',
  stopInspecting: 'Stop Inspecting',
  shortcutHintLabel: 'Shortcut:',
  copyFormat: 'Copy Format',
  formatCSS: 'Standard CSS',
  formatCSSVars: 'CSS Variables',
  formatMinified: 'Minified',
  theme: 'Theme',
  themeSystem: 'System Default',
  themeLight: 'Light',
  themeDark: 'Dark',
  language: 'Language',
  langAuto: 'System Default',
  langEn: 'English',
  langZh: '中文',
  settings: 'Settings',
  settingsTitle: 'SnapCSS Settings',
  settingsSaved: 'Settings saved',
  shortcutKey: 'Shortcut Key',
  shortcutKeyDesc: 'Current shortcut: Alt + C. You can customize it in Chrome\'s extension shortcuts settings.',
  shortcutKeyChange: 'Change Shortcut →',
  contextMenuInspect: 'Inspect with SnapCSS',
  toggleInspectDesc: 'Toggle SnapCSS inspect mode',
  panelFontInfo: 'Font',
  panelSize: 'Size',
  panelStyles: 'Styles',
  panelComputed: 'Computed',
  panelCopyAll: 'Copy All CSS',
  copied: 'Copied!',
  panelLocked: 'Panel locked',
  maxPanelsReached: 'Max pinned panels reached',
  hintLock: 'Lock',
  hintPause: 'Pause',
  hintNav: 'Navigate',
  iframeNotice: 'Cannot inspect inside iframe (cross-origin)',
};

let currentLang: 'auto' | 'en' | 'zh' = 'auto';

function isZh(): boolean {
  try {
    return navigator.language?.startsWith('zh') ?? false;
  } catch {
    return false;
  }
}

function getActiveFallback(): Record<string, string> {
  if (currentLang === 'zh') return FALLBACK_ZH;
  if (currentLang === 'en') return FALLBACK_EN;
  return isZh() ? FALLBACK_ZH : FALLBACK_EN;
}

export function setLanguage(lang: 'auto' | 'en' | 'zh') {
  currentLang = lang;
}

export function getLanguage(): 'auto' | 'en' | 'zh' {
  return currentLang;
}

export function t(key: string, substitutions?: string | string[]): string {
  if (currentLang === 'auto') {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        const msg = chrome.i18n.getMessage(key, substitutions);
        if (msg) return msg;
      }
    } catch {
      // Silently fall through
    }
  }

  return getActiveFallback()[key] || FALLBACK_EN[key] || key;
}

export function applyI18n(root: Document | ShadowRoot = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')!;
    el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder')!;
    (el as HTMLInputElement).placeholder = t(key);
  });

  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title')!;
    (el as HTMLElement).title = t(key);
  });
}
