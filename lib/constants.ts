export const MSG = {
  TOGGLE_INSPECT: 'toggle-inspect',
  GET_STATE: 'get-state',
  STATE_CHANGED: 'state-changed',
} as const;

export const STORAGE_KEYS = {
  COPY_FORMAT: 'copyFormat',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

export type CopyFormat = 'css' | 'css-variables' | 'minified';
export type Theme = 'system' | 'light' | 'dark';
export type Language = 'auto' | 'en' | 'zh';

export interface ExtensionState {
  active: boolean;
  tabId?: number;
}

export interface ToggleMessage {
  type: typeof MSG.TOGGLE_INSPECT;
  active?: boolean;
  tabId?: number;
}

export interface GetStateMessage {
  type: typeof MSG.GET_STATE;
  tabId?: number;
}

export type Message = ToggleMessage | GetStateMessage;
