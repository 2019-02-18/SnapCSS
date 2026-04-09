import type { ChatMessage } from './service';
import { getLanguage } from '../i18n';

function getSystemPrompt(): string {
  const lang = getLanguage();
  const langInst =
    lang === 'zh' ? 'Always respond in Chinese (简体中文).' :
    lang === 'en' ? 'Always respond in English.' :
    (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh'))
      ? 'Always respond in Chinese (简体中文).'
      : 'Always respond in English.';

  return `You are SnapCSS AI, an expert CSS assistant embedded in a browser extension. You analyze CSS properties extracted from web page elements. Be concise, practical, and provide code examples when helpful. ${langInst}`;
}

export type PromptAction = 'explain' | 'optimize' | 'responsive' | 'chat';

function buildContext(selector: string, cssText: string): string {
  return `Element: \`${selector}\`\n\nCSS:\n\`\`\`css\n${cssText}\n\`\`\``;
}

export function buildMessages(
  action: PromptAction,
  selector: string,
  cssText: string,
  userMessage?: string,
): ChatMessage[] {
  const context = buildContext(selector, cssText);

  const actionPrompts: Record<Exclude<PromptAction, 'chat'>, string> = {
    explain: `Analyze and explain the following element's CSS layout and styling. Describe what visual effect these properties create, how the layout works (flex/grid/position), and any notable patterns.\n\n${context}`,
    optimize: `Review the following CSS and suggest optimizations:\n1. Redundant or unnecessary properties\n2. Modern CSS alternatives (e.g., gap instead of margin hacks)\n3. Performance improvements\n4. Best practice violations\n\nProvide the optimized CSS code.\n\n${context}`,
    responsive: `Analyze the following CSS and suggest responsive design improvements:\n1. Replace fixed values (px) with relative units where appropriate\n2. Add media query breakpoints for mobile/tablet\n3. Suggest flexbox/grid improvements for responsiveness\n4. Identify potential overflow or layout issues on small screens\n\nProvide responsive CSS code.\n\n${context}`,
  };

  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt() },
  ];

  if (action === 'chat') {
    messages.push({
      role: 'user',
      content: `${context}\n\nUser question: ${userMessage || ''}`,
    });
  } else {
    messages.push({ role: 'user', content: actionPrompts[action] });
  }

  return messages;
}
