export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  chat(
    messages: ChatMessage[],
    config: AIConfig,
    options?: ChatOptions,
  ): AsyncGenerator<string, void, unknown>;
  testConnection(config: AIConfig): Promise<boolean>;
}

export interface AIConfig {
  provider: AIProviderType;
  apiKey: string;
  endpoint?: string;
  model?: string;
}

export type AIProviderType = 'openai' | 'claude' | 'gemini' | 'deepseek' | 'moonshot' | 'qwen' | 'custom';

export const AI_STORAGE_KEY = 'aiConfig';

const providerRegistry = new Map<string, AIProvider>();

export function registerProvider(provider: AIProvider) {
  providerRegistry.set(provider.id, provider);
}

export function getProvider(id: string): AIProvider | undefined {
  return providerRegistry.get(id);
}

export function getAllProviders(): AIProvider[] {
  return Array.from(providerRegistry.values());
}

export async function loadAIConfig(): Promise<AIConfig | null> {
  try {
    const result = await chrome.storage.local.get(AI_STORAGE_KEY);
    return result[AI_STORAGE_KEY] || null;
  } catch {
    return null;
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  await chrome.storage.local.set({ [AI_STORAGE_KEY]: config });
}

export async function* streamChat(
  messages: ChatMessage[],
  options?: ChatOptions,
): AsyncGenerator<string, void, unknown> {
  const config = await loadAIConfig();
  if (!config?.apiKey) throw new Error('AI not configured');

  const provider = getProvider(config.provider);
  if (!provider) throw new Error(`Unknown provider: ${config.provider}`);

  yield* provider.chat(messages, config, options);
}

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
  deepseek: 'deepseek-chat',
  moonshot: 'moonshot-v1-8k',
  qwen: 'qwen-plus',
  custom: '',
};

export const DEFAULT_ENDPOINTS: Record<AIProviderType, string> = {
  openai: 'https://api.openai.com',
  claude: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com',
  moonshot: 'https://api.moonshot.cn',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode',
  custom: '',
};
