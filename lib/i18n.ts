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
  // AI
  aiExplain: '解读',
  aiOptimize: '优化',
  aiResponsive: '响应式',
  aiPlaceholder: '选择一个分析操作或自由提问',
  aiInputPlaceholder: '输入你的问题...',
  aiSend: '发送',
  aiNotConfigured: '请先在设置页面配置 AI API Key',
  aiSettings: 'AI 设置',
  aiProvider: 'AI 提供商',
  aiCustom: '自定义',
  aiApiKey: 'API Key',
  aiEndpoint: '自定义地址',
  aiModel: '模型名称',
  aiTestConnection: '测试连接',
  aiSave: '保存 AI 设置',
  aiTesting: '正在测试连接...',
  aiTestSuccess: '连接成功！',
  aiTestFail: '连接失败',
  aiPrivacyNote: 'API Key 仅存储在本地，CSS 数据仅在你主动点击分析时发送到你配置的 API 地址。',
  aiQwen: '通义千问（百炼）',
  aiNotReady: 'AI 未配置 → 去设置',
  aiQuickStart: '快速开始 — 获取免费 API Key',
  aiGeminiFree: '免费额度 →',
  aiDeepseekFree: '新用户免费 →',
  // A11y
  a11yContrast: '颜色对比度',
  a11yForeground: '前景色',
  a11yBackground: '背景色',
  a11yPreviewText: 'Aa 示例文本预览',
  a11yFontSize: '字号评估',
  a11yFontSizeValue: '字号',
  a11yLargeText: '大文本',
  a11yReadable: '可读性',
  a11yYes: '是',
  a11yNo: '否',
  a11yNoElement: '无可检查元素',
  a11yError: '检查失败',
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
  // AI
  aiExplain: 'Explain',
  aiOptimize: 'Optimize',
  aiResponsive: 'Responsive',
  aiPlaceholder: 'Choose an action or ask a question',
  aiInputPlaceholder: 'Ask a question...',
  aiSend: 'Send',
  aiNotConfigured: 'Please configure your AI API Key in Settings first',
  aiSettings: 'AI Settings',
  aiProvider: 'AI Provider',
  aiCustom: 'Custom',
  aiApiKey: 'API Key',
  aiEndpoint: 'Custom Endpoint',
  aiModel: 'Model Name',
  aiTestConnection: 'Test Connection',
  aiSave: 'Save AI Settings',
  aiTesting: 'Testing connection...',
  aiTestSuccess: 'Connection successful!',
  aiTestFail: 'Connection failed',
  aiPrivacyNote: 'API Key is stored locally only. CSS data is sent to your configured API endpoint only when you actively click an analysis action.',
  aiQwen: 'Qwen (Alibaba)',
  aiNotReady: 'AI not configured → Settings',
  aiQuickStart: 'Quick Start — Get a Free API Key',
  aiGeminiFree: 'Free tier →',
  aiDeepseekFree: 'Free for new users →',
  // A11y
  a11yContrast: 'Color Contrast',
  a11yForeground: 'Foreground',
  a11yBackground: 'Background',
  a11yPreviewText: 'Aa Sample text preview',
  a11yFontSize: 'Font Size',
  a11yFontSizeValue: 'Size',
  a11yLargeText: 'Large Text',
  a11yReadable: 'Readable',
  a11yYes: 'Yes',
  a11yNo: 'No',
  a11yNoElement: 'No element to check',
  a11yError: 'Check failed',
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
