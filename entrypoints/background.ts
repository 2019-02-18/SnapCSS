import { MSG } from '@/lib/constants';
import type { Message, ExtensionState } from '@/lib/constants';

export default defineBackground(() => {
  const tabStates = new Map<number, boolean>();

  function getTabState(tabId: number): boolean {
    return tabStates.get(tabId) ?? false;
  }

  function setTabState(tabId: number, active: boolean) {
    if (active) {
      tabStates.set(tabId, true);
    } else {
      tabStates.delete(tabId);
    }
    updateBadge(tabId, active);

    // Broadcast to popup (if open)
    chrome.runtime.sendMessage({
      type: MSG.STATE_CHANGED,
      active,
      tabId,
    }).catch(() => { /* popup not open */ });
  }

  function updateBadge(tabId: number, active: boolean) {
    chrome.action.setBadgeText({
      text: active ? 'ON' : '',
      tabId,
    });
    chrome.action.setBadgeBackgroundColor({
      color: active ? '#6366f1' : '#000000',
      tabId,
    });
  }

  async function toggleTab(tabId: number, forceState?: boolean) {
    const currentState = getTabState(tabId);
    const newState = forceState ?? !currentState;
    setTabState(tabId, newState);

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (active: boolean) => {
        window.dispatchEvent(
          new CustomEvent('snapcss:activate', { detail: { active } }),
        );
      },
      args: [newState],
    });

    return newState;
  }

  chrome.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      if (message.type === MSG.TOGGLE_INSPECT) {
        const tabId = sender.tab?.id || message.tabId;
        if (!tabId) {
          sendResponse({ active: false } satisfies ExtensionState);
          return true;
        }

        const newState = message.active ?? !getTabState(tabId);
        setTabState(tabId, newState);

        if (!sender.tab?.id) {
          toggleTab(tabId, newState).then(() => {
            sendResponse({ active: newState } satisfies ExtensionState);
          });
          return true;
        }

        sendResponse({ active: newState } satisfies ExtensionState);
        return true;
      }

      if (message.type === MSG.GET_STATE) {
        const tabId = sender.tab?.id || message.tabId;
        if (!tabId) {
          sendResponse({ active: false } satisfies ExtensionState);
          return true;
        }
        sendResponse({ active: getTabState(tabId) } satisfies ExtensionState);
        return true;
      }
    },
  );

  chrome.contextMenus.create({
    id: 'snapcss-inspect',
    title: chrome.i18n?.getMessage?.('contextMenuInspect') || 'Inspect with SnapCSS',
    contexts: ['all'],
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'snapcss-inspect' || !tab?.id) return;
    await toggleTab(tab.id, true);
  });

  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle_inspect') return;

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    await toggleTab(tab.id);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    tabStates.delete(tabId);
  });
});
