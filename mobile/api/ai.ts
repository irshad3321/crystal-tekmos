import { ApiError, getJson, postJson } from './client';
import type { Currency } from '@/constants/currencies';

export type AiHistoryItem = { role: 'user' | 'assistant'; text: string };

type AiChatResponse = { success: true; reply: string };

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await getJson<{ status: string }>('/api/health');
    return response?.status === 'ok';
  } catch {
    return false;
  }
}

export async function askGoldyy(message: string, history: AiHistoryItem[], signal?: AbortSignal, currency?: Currency): Promise<string> {
  const response = await postJson<AiChatResponse>('/api/ai/chat', {
    message,
    context: { history: history.slice(-8), currency },
  }, signal);
  if (response?.success !== true || typeof response.reply !== 'string' || !response.reply.trim()) {
    throw new ApiError('Goldyy returned an invalid response.', undefined, 'invalid-response');
  }
  return response.reply.trim();
}

export function getGoldyyErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Goldyy could not answer. Try again.';
  if (error.kind === 'configuration') return 'Goldyy needs a backend address. Check app configuration.';
  if (error.kind === 'network') return 'Cannot connect to Goldyy’s server. Check Wi-Fi and the backend.';
  if (error.kind === 'timeout' || error.status === 504) return 'Goldyy took too long to respond. Try again.';
  if (error.kind === 'invalid-response') return 'Goldyy received an unreadable answer. Try again.';
  if (error.status === 429) return 'Goldyy is busy. Try again in a moment.';
  if (error.status === 400) return 'Check your message and try again.';
  if (error.status === 404) return 'Goldyy chat is unavailable on this backend.';
  if (error.status === 503 && /credentials|not configured/i.test(error.message)) {
    return 'Goldyy is not configured on the server. Contact support.';
  }
  if (error.status === 503) return 'Goldyy’s AI service is temporarily unavailable. Try again shortly.';
  if (error.status === 502) return 'Goldyy could not read the AI response. Try again.';
  return 'Goldyy could not answer. Try again.';
}
