import { COPY } from '@/constants/copy';
import { ApiError, getJson, postJson } from './client';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type { Currency } from '@/constants/currencies';

export type AiHistoryItem = { role: 'user' | 'assistant'; text: string };

type AiChatResponse = { success: true; reply: string };

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await getJson<{ status: string }>(API_ENDPOINTS.HEALTH);
    return response?.status === 'ok';
  } catch {
    return false;
  }
}

export async function askGoldyy(message: string, history: AiHistoryItem[], signal?: AbortSignal, currency?: Currency): Promise<string> {
  const response = await postJson<AiChatResponse>(API_ENDPOINTS.AI_CHAT, {
    message,
    context: { history: history.slice(-8), currency },
  }, signal);
  if (response?.success !== true || typeof response.reply !== 'string' || !response.reply.trim()) {
    throw new ApiError(ERROR_MESSAGES.INVALID_AI_REPLY, undefined, 'invalid-response');
  }
  return response.reply.trim();
}

export function getGoldyyErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return COPY.GOLDYY_COULD_NOT_ANSWER_TRY_AGAIN;
  if (error.kind === 'configuration') return COPY.GOLDYY_BACKEND_URL_MISSING;
  if (error.kind === 'network') return COPY.GOLDYY_NETWORK_UNAVAILABLE;
  if (error.kind === 'timeout' || error.status === 504) return COPY.GOLDYY_TOOK_TOO_LONG_TO_RESPOND_TRY_AGAIN;
  if (error.kind === 'invalid-response') return COPY.GOLDYY_UNREADABLE_RESPONSE;
  if (error.status === 429) return COPY.GOLDYY_IS_BUSY_TRY_AGAIN_IN_A_MOMENT;
  if (error.status === 400) return COPY.CHECK_YOUR_MESSAGE_AND_TRY_AGAIN;
  if (error.status === 404) return COPY.GOLDYY_ROUTE_UNAVAILABLE;
  if (error.status === 503 && /credentials|not configured/i.test(error.message)) {
    return COPY.GOLDYY_SERVER_UNCONFIGURED;
  }
  if (error.status === 503) return COPY.GOLDYY_PROVIDER_UNAVAILABLE;
  if (error.status === 502) return COPY.GOLDYY_INVALID_PROVIDER_RESPONSE;
  return COPY.GOLDYY_COULD_NOT_ANSWER_TRY_AGAIN;
}
