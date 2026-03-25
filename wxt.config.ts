import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: '1.0.0',
    permissions: ['activeTab', 'scripting', 'storage', 'contextMenus'],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icon/icon-16.png',
        '32': 'icon/icon-32.png',
        '48': 'icon/icon-48.png',
        '128': 'icon/icon-128.png',
      },
    },
    icons: {
      '16': 'icon/icon-16.png',
      '32': 'icon/icon-32.png',
      '48': 'icon/icon-48.png',
      '128': 'icon/icon-128.png',
    },
    commands: {
      toggle_inspect: {
        suggested_key: { default: 'Alt+C' },
        description: '__MSG_toggleInspectDesc__',
      },
    },
  },
});
