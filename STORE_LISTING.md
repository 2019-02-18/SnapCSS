# Chrome Web Store Listing — SnapCSS

## Short Description (132 chars max)

Hover any element, see CSS styles, AI analysis & accessibility check. A smarter alternative to DevTools.

## Detailed Description

SnapCSS lets you inspect the CSS of any element on any web page — instantly.

Just activate inspect mode, hover over an element, and click to see its full, cleaned CSS in a beautiful floating panel. No more digging through DevTools.

**KEY FEATURES:**

• Instant CSS Inspection — Hover to highlight, click to see all CSS properties
• Smart CSS Cleaning — Filters out browser defaults, only shows meaningful styles
• Original Units — Preserves authored values like rem, em, % instead of converting everything to px
• Pseudo-Class Styles — Extracts :hover, :focus, :active styles from stylesheets
• Pseudo-Elements — Shows ::before and ::after styles
• One-Click Copy — Copy all CSS or click individual properties to copy one at a time
• Multi-Panel Comparison — Lock panels with Space key, inspect more elements side by side
• DOM Navigation — Arrow keys to traverse parent, child, and sibling elements
• Color Swatches — Visual color previews with click-to-copy
• Copy Formats — Standard CSS, CSS Variables, or Minified single-line
• Dark & Light Theme — Follows your system or set manually
• Bilingual — English and Chinese UI, switch anytime in settings
• Keyboard Shortcut — Alt+C to toggle (customizable in Chrome settings)
• SVG Support — Works with SVG elements too
• AI CSS Analysis — Explain, optimize, and get responsive suggestions for any element's CSS (BYO API Key)
• Accessibility Check — WCAG contrast ratio, AA/AAA compliance, font readability assessment
• Multi-Provider AI — Supports OpenAI, Claude, Gemini, and custom endpoints
• Zero Dependencies — Core features work offline, AI features use your own API key

**KEYBOARD SHORTCUTS:**
• Alt+C — Toggle inspect mode
• Click — Select element
• Space — Lock panel for comparison
• Shift — Pause inspection
• Arrow keys — Navigate DOM tree
• Escape — Exit inspect mode

**PRIVACY:**
SnapCSS runs 100% locally. No analytics, no tracking. AI features are optional and use your own API key — CSS data is only sent to your configured AI provider when you explicitly click an analysis action. No data is ever sent to SnapCSS servers.

Built for frontend developers, UI designers, and anyone who works with CSS.

## Category

Developer Tools

## Language

English, Chinese (Simplified)

## Tags / Keywords

css, inspector, css viewer, web development, frontend, design, css copy, element inspector, developer tools, css extractor

---

## 单一用途说明（Single Purpose Description）

SnapCSS is a CSS inspection tool that allows users to hover and click any web page element to view and copy its CSS styles, without opening DevTools.

## 需要请求 activeTab 的理由（activeTab Permission Justification）

activeTab is required to access the current tab's DOM elements. When the user explicitly clicks "Start Inspecting" or uses the keyboard shortcut, the extension reads element CSS styles via window.getComputedStyle(). This permission is only used upon explicit user activation.

## 需要请求 scripting 的理由（scripting Permission Justification）

scripting is required to inject the inspection overlay (highlight box, info tag, and floating CSS panel) into the current web page. The content script only reads element styles and renders the inspection UI. It does not modify any page content. Injection only occurs when the user explicitly activates inspect mode.

## 需要请求 storage 的理由（storage Permission Justification）

storage is used to save local user preferences via chrome.storage.sync: copy format (Standard CSS / CSS Variables / Minified), theme (System / Light / Dark), and language (System / English / Chinese). chrome.storage.local is used to store optional AI configuration (provider selection, API key, endpoint, model name). Only simple key-value settings are stored. No personal data is collected or transmitted to SnapCSS servers.

## 需要请求 contextMenus 的理由（contextMenus Permission Justification）

contextMenus is used to add a single "Inspect with SnapCSS" option to the right-click context menu, providing an alternative way to activate inspect mode. Only one static menu item is added, no submenus or dynamic content.

## 需要请求主机权限的理由（Host Permission Justification）

The content script uses the `<all_urls>` match pattern because SnapCSS is a general-purpose CSS inspection tool that needs to work on any web page. The content script injects a visual overlay (highlight box and CSS panel) into the page, only reads element styles via getComputedStyle(), and does not modify any page content or data.

## 远程代码（Remote Code）

选择：**不，我并未使用远程代码**（No, I am not using remote code）

SnapCSS does not load any external scripts, modules, or code. All JavaScript and CSS are bundled within the extension package.
