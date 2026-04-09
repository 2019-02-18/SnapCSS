# SnapCSS

**悬停任意元素，即时查看 CSS 样式，一键复制。**

[English](#english) | 中文

SnapCSS 是一款面向前端开发者和 UI 设计师的 Chrome 扩展。无需打开开发者工具，只需悬停并点击网页上的任意元素，即可在浮动面板中查看其完整、干净的 CSS 样式，一键复制。

## 功能特性

- **即时 CSS 检查** — 悬停高亮元素，点击查看全部 CSS 属性
- **智能样式清洗** — 自动过滤浏览器默认样式、webkit 前缀和噪声属性，只展示有意义的 CSS
- **保留原始单位** — 保留 rem/em/% 等作者原始值，不全部转换为 px
- **伪类样式提取** — 从样式表中提取 :hover/:focus/:active 等伪类样式
- **伪元素支持** — 提取 `::before` 和 `::after` 样式
- **一键复制** — 复制全部 CSS 或点击单行属性复制单条声明
- **多面板对比** — 按 `Space` 锁定当前面板，最多锁定 5 个面板并排对比
- **DOM 导航** — 方向键 `↑↓←→` 遍历父/子/兄弟元素
- **暂停模式** — 按 `Shift` 暂停检查，自由移动鼠标
- **色块预览** — 颜色值旁显示色块，点击即可复制颜色
- **深色/浅色主题** — 跟随系统或手动设置
- **复制格式** — 标准 CSS、CSS 变量、压缩单行
- **双语支持** — 中文/英文界面，随时切换
- **快捷键** — `Alt+C` 切换检查模式（可自定义）
- **右键菜单** — 「用 SnapCSS 检查」快捷入口
- **SVG 支持** — 正确处理 SVG 元素
- **AI CSS 分析** — 解读、优化建议、响应式建议，自由对话（需自行配置 API Key）
- **多 AI 提供商** — OpenAI / Claude / Gemini / DeepSeek / Kimi / 通义千问 / 自定义
- **可访问性检查** — WCAG 对比度检测（AA/AAA）、字号可读性评估
- **零依赖** — 核心功能离线可用，AI 功能使用用户自己的 API Key

## 安装

### 从源码构建

```bash
git clone https://github.com/2019-02-18/SnapCSS.git
cd SnapCSS
npm install
npm run build
```

然后在 Chrome 中加载：

1. 打开 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `.output/chrome-mv3` 文件夹

### Chrome 应用商店

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kcacjomlfcnflimmcnegppmejdebdcon?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/snapcss/kcacjomlfcnflimmcnegppmejdebdcon)

[**前往安装 →**](https://chromewebstore.google.com/detail/snapcss/kcacjomlfcnflimmcnegppmejdebdcon)

## 使用方法

1. 点击工具栏中的 SnapCSS 图标（或按 `Alt+C`）激活检查模式
2. **悬停** 任意元素 — 紫色边框高亮 + 信息标签
3. **点击** 元素 — 浮动面板显示全部计算样式
4. **复制** — 点击「复制全部 CSS」或点击单行属性复制
5. **锁定面板** — 按 `Space` 锁定当前面板，再点击其他元素进行对比
6. **导航** — 方向键在 DOM 树中移动
7. **暂停** — 按 `Shift` 冻结当前选中
8. **退出** — 按 `Escape` 或再次点击切换按钮

## 快捷键

| 按键 | 功能 |
|------|------|
| `Alt+C` | 切换检查模式 |
| `点击` | 选中元素并显示 CSS 面板 |
| `Space` | 锁定当前面板进行对比 |
| `Shift` | 暂停/恢复检查 |
| `↑` | 导航到父元素 |
| `↓` | 导航到第一个可见子元素 |
| `←` | 导航到前一个兄弟元素 |
| `→` | 导航到后一个兄弟元素 |
| `Escape` | 退出检查模式 |

## 技术栈

- **Manifest V3** — Chrome 扩展标准
- **TypeScript** — 类型安全
- **WXT 框架** — 基于 Vite 的现代扩展构建工具
- **Shadow DOM** — UI 样式隔离，不影响宿主页面
- **零外部 CDN** — 所有资源本地打包

## 项目结构

```
SnapCSS/
├── entrypoints/
│   ├── content.ts          # 内容脚本（主协调逻辑）
│   ├── background.ts       # Service Worker（状态、徽标、快捷键）
│   ├── popup/              # 扩展弹出窗口
│   └── options/            # 设置页面
├── lib/
│   ├── inspector.ts        # DOM 检查 & 高亮
│   ├── panel.ts            # 浮动 CSS 面板（Shadow DOM，含 AI/A11y 标签页）
│   ├── css-parser.ts       # CSS 提取 & 清洗
│   ├── a11y-checker.ts     # 可访问性检查（WCAG 对比度/字号）
│   ├── ai/                 # AI 模块
│   │   ├── service.ts      # AI 服务抽象层
│   │   ├── prompts.ts      # 预设 Prompt 模板
│   │   ├── index.ts        # 统一导出 & 初始化
│   │   └── providers/      # OpenAI / Claude / Gemini 提供商
│   ├── copy.ts             # 剪贴板操作
│   ├── constants.ts        # 消息类型 & 存储键
│   └── i18n.ts             # 国际化
├── public/
│   ├── _locales/           # en、zh_CN 翻译文件
│   └── icon/               # 扩展图标
├── wxt.config.ts           # WXT/Manifest 配置
└── package.json
```

## 隐私

SnapCSS 核心功能完全在浏览器本地运行。不收集、不传输任何用户数据到 SnapCSS 服务器。AI 功能使用用户自行配置的 API Key，CSS 数据仅在用户主动点击分析时发送到用户配置的 API 地址。无分析、无追踪。

## 许可证

[MIT](LICENSE)

---

<a id="english"></a>

# SnapCSS (English)

**Hover any element, instantly see its CSS, one-click copy.**

SnapCSS is a Chrome extension for frontend developers and UI designers. It replaces the tedious DevTools "Inspect Element" workflow — just hover over any element on any webpage to see its cleaned CSS styles in a floating panel, and copy with one click.

## Features

- **Instant CSS Inspection** — Hover any element to highlight it; click to see its full CSS in a floating panel
- **Smart CSS Cleaning** — Filters out browser defaults, webkit prefixes, and noise; only shows meaningful CSS
- **Original Units** — Preserves authored values like rem, em, % instead of converting everything to px
- **Pseudo-Class Styles** — Extracts :hover, :focus, :active styles from stylesheets
- **Pseudo-Elements** — Shows ::before and ::after styles
- **One-Click Copy** — Copy all CSS or click individual property rows to copy single declarations
- **Multi-Panel Comparison** — Press `Space` to lock panels; up to 5 locked panels for side-by-side comparison
- **DOM Navigation** — Arrow keys (`↑↓←→`) to traverse parent, child, and siblings
- **Pause Mode** — Press `Shift` to pause inspection and freely move the mouse
- **Color Swatches** — Visual color previews with click-to-copy
- **Dark / Light Theme** — Follows system preference or set manually
- **Copy Formats** — Standard CSS, CSS Variables, or Minified
- **Bilingual** — English and Chinese UI, switch anytime in settings
- **Keyboard Shortcut** — `Alt+C` to toggle inspect mode (customizable)
- **Context Menu** — "Inspect with SnapCSS" right-click entry
- **SVG Support** — Properly handles SVG elements
- **AI CSS Analysis** — Explain, optimize, responsive suggestions, free-form chat (BYO API Key)
- **Multi-Provider AI** — OpenAI / Claude / Gemini / DeepSeek / Kimi / Qwen / Custom
- **Accessibility Check** — WCAG contrast ratio (AA/AAA), font readability assessment
- **Zero Dependencies** — Core features work offline; AI features use your own API key

## Install

### From Source

```bash
git clone https://github.com/2019-02-18/SnapCSS.git
cd SnapCSS
npm install
npm run build
```

Then load in Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` folder

### Chrome Web Store

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/kcacjomlfcnflimmcnegppmejdebdcon?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/snapcss/kcacjomlfcnflimmcnegppmejdebdcon)

[**Install →**](https://chromewebstore.google.com/detail/snapcss/kcacjomlfcnflimmcnegppmejdebdcon)

## Usage

1. Click the SnapCSS icon in the toolbar (or press `Alt+C`) to activate inspect mode
2. **Hover** any element — highlighted with purple outline and info tag
3. **Click** an element — the CSS panel appears showing all computed styles
4. **Copy** — click "Copy All CSS", or click any property row to copy that single declaration
5. **Lock panels** — press `Space` to lock the current panel, then click another element to compare
6. **Navigate** — use arrow keys to move through the DOM tree
7. **Pause** — press `Shift` to freeze the current selection
8. **Exit** — press `Escape` or click the toggle button again

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Alt+C` | Toggle inspect mode |
| `Click` | Select element and show CSS panel |
| `Space` | Lock current panel for comparison |
| `Shift` | Pause/resume inspection |
| `↑` | Navigate to parent element |
| `↓` | Navigate to first visible child |
| `←` | Navigate to previous sibling |
| `→` | Navigate to next sibling |
| `Escape` | Exit inspect mode |

## Privacy

SnapCSS core features run entirely in your browser. No user data is collected or sent to any SnapCSS server. The optional AI feature uses your own API key, and CSS data is only sent to your configured AI endpoint when you explicitly click an analysis action. No analytics, no tracking.

## License

[MIT](LICENSE)
