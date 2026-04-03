# Privacy Policy — SnapCSS

**Last updated: March 25, 2026**

## Overview

SnapCSS is a Chrome browser extension that allows developers and designers to inspect CSS styles of web page elements. This privacy policy explains how SnapCSS handles your data.

## Data Collection

**SnapCSS does not collect, store, or transmit any personal data.**

Specifically:

- **No analytics** — We do not use any analytics or tracking services
- **No network requests** — The extension makes zero network requests. It works entirely offline
- **No user data storage** — We do not store browsing history, page content, or any form of personal information
- **No third-party services** — We do not integrate with any external APIs or services

## Data Usage

The extension only accesses the following browser APIs for its core functionality:

- **`activeTab`** — To inspect CSS styles on the currently active tab when you activate inspect mode
- **`scripting`** — To inject the inspection overlay into web pages
- **`storage`** — To save your local preferences (theme choice, copy format) using `chrome.storage.sync`. These preferences are stored locally in your browser profile and never transmitted to any server
- **`contextMenus`** — To add an "Inspect with SnapCSS" option to the right-click menu

## Local Preferences

SnapCSS stores the following user preferences locally via Chrome's built-in storage API:

- Copy format preference (Standard CSS / CSS Variables / Minified)
- Theme preference (System / Light / Dark)
- Language preference (System Default / English / Chinese)

These settings sync across your Chrome instances through Chrome's own sync mechanism if you have Chrome Sync enabled. SnapCSS has no access to or control over Chrome Sync.

## CSS Data

When you inspect an element, SnapCSS reads its computed CSS styles using the browser's standard `window.getComputedStyle()` API. This CSS data:

- Is only displayed in the floating panel on your screen
- Is only copied to your clipboard when you explicitly click "Copy"
- Is never stored, logged, or transmitted anywhere
- Is discarded as soon as you close the panel or deactivate inspect mode

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date at the top of this document.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/2019-02-18/SnapCSS/issues).
