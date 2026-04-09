import type { AIProvider, AIConfig, ChatMessage, ChatOptions } from '../service';

async function* streamSSE(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): AsyncGenerator<string, void, unknown> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export const openaiProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',

  async *chat(messages: ChatMessage[], config: AIConfig, options?: ChatOptions) {
    const base = (config.endpoint || 'https://api.openai.com').replace(/\/+$/, '');
    const url = `${base}/v1/chat/completions`;
    const model = config.model || 'gpt-4o-mini';

    yield* streamSSE(
      url,
      { Authorization: `Bearer ${config.apiKey}` },
      {
        model,
        messages,
        stream: true,
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature ?? 0.7,
      },
    );
  },

  async testConnection(config: AIConfig): Promise<boolean> {
    const base = (config.endpoint || 'https://api.openai.com').replace(/\/+$/, '');
    const url = `${base}/v1/chat/completions`;
    const model = config.model || 'gpt-4o-mini';

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      }),
    });

    return resp.ok;
  },
};
