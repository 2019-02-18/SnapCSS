import type { AIProvider, AIConfig, ChatMessage, ChatOptions } from '../service';

export const claudeProvider: AIProvider = {
  id: 'claude',
  name: 'Claude',

  async *chat(messages: ChatMessage[], config: AIConfig, options?: ChatOptions) {
    const base = (config.endpoint || 'https://api.anthropic.com').replace(/\/+$/, '');
    const url = `${base}/v1/messages`;
    const model = config.model || 'claude-sonnet-4-20250514';

    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens || 2048,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Claude API error ${resp.status}: ${text}`);
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
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const json = JSON.parse(data);
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield json.delta.text;
          }
        } catch {
          // skip
        }
      }
    }
  },

  async testConnection(config: AIConfig): Promise<boolean> {
    const base = (config.endpoint || 'https://api.anthropic.com').replace(/\/+$/, '');
    const url = `${base}/v1/messages`;
    const model = config.model || 'claude-sonnet-4-20250514';

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    return resp.ok;
  },
};
