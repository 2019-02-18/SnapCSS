import type { AIProvider, AIConfig, ChatMessage, ChatOptions } from '../service';

function toGeminiMessages(messages: ChatMessage[]) {
  const system = messages.find(m => m.role === 'system');
  const chat = messages.filter(m => m.role !== 'system');

  const contents = chat.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  return {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system.content }] } } : {}),
  };
}

export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: 'Gemini',

  async *chat(messages: ChatMessage[], config: AIConfig, options?: ChatOptions) {
    const base = (config.endpoint || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    const model = config.model || 'gemini-2.0-flash';
    const url = `${base}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

    const body = {
      ...toGeminiMessages(messages),
      generationConfig: {
        maxOutputTokens: options?.maxTokens || 2048,
        temperature: options?.temperature ?? 0.7,
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini API error ${resp.status}: ${text}`);
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
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // skip
        }
      }
    }
  },

  async testConnection(config: AIConfig): Promise<boolean> {
    const base = (config.endpoint || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    const model = config.model || 'gemini-2.0-flash';
    const url = `${base}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    return resp.ok;
  },
};
