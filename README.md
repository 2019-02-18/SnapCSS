# SnapCSS

**Hover any element, instantly see its CSS, one-click copy.**

SnapCSS is a Chrome extension for frontend developers and UI designers. It replaces the tedious DevTools "Inspect Element" workflow — just hover over any element on any webpage to see its cleaned CSS styles in a floating panel, and copy with one click.

## Features

- **Instant CSS Inspection** — Hover any element to highlight it with a box-model overlay; click to see its full CSS in a floating panel
- **Smart CSS Cleaning** — Filters out browser default styles, webkit prefixes, and noise properties; only shows meaningful CSS
- **One-Click Copy** — Copy all CSS or click individual property rows to copy single declarations
- **Multi-Panel Comparison** — Press `Space` to lock the current panel, then inspect another element. Up to 5 locked panels for side-by-side comparison
- **DOM Navigation** — Use arrow keys (`↑↓←→`) to traverse the DOM tree (parent, child, siblings)
- **Pause Mode** — Press `Shift` to pause inspection and freely move the mouse
- **Pseudo-Element Support** — Extracts `::before` and `::after` styles
- **Color Swatches** — Visual color previews with click-to-copy
- **Dark / Light Theme** — Follows system preference or manually set in popup
- **Copy Formats** — Standard CSS, CSS Variables, or Minified
- **Keyboard Shortcut** — `Alt+C` to toggle inspect mode (customizable)
- **Right-Click Menu** — "Inspect with SnapCSS" context menu entry
- **SVG Support** — Properly handles SVG elements
- **i18n** — English and Chinese (Simplified) interface
- **Zero Dependencies** — Pure frontend, works offline, no data sent anywhere

## Install

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/user/snapcss.git
cd snapcss

# Install dependencies
npm install

# Build for Chrome
npm run build

# Or start dev mode with hot reload
npm run dev
```

Then load the extension in Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` folder

### From Chrome Web Store

Coming soon.

## Usage

1. Click the SnapCSS icon in the toolbar (or press `Alt+C`) to activate inspect mode
2. **Hover** any element — it gets highlighted with a purple outline and info tag
3. **Click** an element — the CSS panel appears showing all computed styles
4. **Copy** — click the "Copy All CSS" button, or click any property row to copy that single declaration
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

## Tech Stack

- **Manifest V3** — Chrome extension standard
- **TypeScript** — Type-safe codebase
- **WXT Framework** — Modern extension build tool (Vite-based)
- **Shadow DOM** — UI isolation from host page styles
- **Zero external CDNs** — All assets bundled locally

## Project Structure

```
snapcss/
├── entrypoints/
│   ├── content.ts          # Content script (orchestration)
│   ├── background.ts       # Service worker (state, badge, shortcuts)
│   ├── popup/              # Extension popup UI
│   └── options/            # Settings page
├── lib/
│   ├── inspector.ts        # DOM inspection & highlighting
│   ├── panel.ts            # Floating CSS panel (Shadow DOM)
│   ├── css-parser.ts       # CSS extraction & cleaning
│   ├── copy.ts             # Clipboard operations
│   ├── constants.ts        # Message types & storage keys
│   └── i18n.ts             # Internationalization
├── public/
│   ├── _locales/           # en, zh_CN translations
│   └── icon/               # Extension icons
├── wxt.config.ts           # WXT/Manifest configuration
└── package.json
```

## Privacy

SnapCSS runs entirely in your browser. It does not collect, transmit, or store any user data. All CSS inspection happens locally via the DOM API. No analytics, no tracking, no network requests.

## License

MIT
