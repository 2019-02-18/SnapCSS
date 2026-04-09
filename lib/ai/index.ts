import { registerProvider } from './service';
import { openaiProvider } from './providers/openai';
import { claudeProvider } from './providers/claude';
import { geminiProvider } from './providers/gemini';

export function initAIProviders() {
  registerProvider(openaiProvider);
  registerProvider(claudeProvider);
  registerProvider(geminiProvider);
  registerProvider({ ...openaiProvider, id: 'deepseek', name: 'DeepSeek' });
  registerProvider({ ...openaiProvider, id: 'moonshot', name: 'Moonshot (Kimi)' });
  registerProvider({ ...openaiProvider, id: 'qwen', name: 'Qwen (通义千问)' });
  registerProvider({ ...openaiProvider, id: 'custom', name: 'Custom' });
}

export {
  streamChat,
  loadAIConfig,
  saveAIConfig,
  getProvider,
  getAllProviders,
  DEFAULT_MODELS,
  DEFAULT_ENDPOINTS,
  AI_STORAGE_KEY,
} from './service';

export type {
  AIConfig,
  AIProviderType,
  ChatMessage,
  ChatOptions,
  AIProvider,
} from './service';
