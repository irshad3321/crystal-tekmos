import { ApiError, getJson } from './client';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type { Currency } from '@/constants/currencies';
import type { HistoryPoint, HistoryRange } from '@/types/prices';

export type { HistoryPoint, HistoryRange } from '@/types/prices';

export async function fetchPriceHistory(metal: 'gold' | 'silver', purity: number, currency: Currency, range: HistoryRange, signal?: AbortSignal): Promise<HistoryPoint[]> {
  const result = await getJson<{
    success: boolean;
    metal: string;
    purity: number;
    currency: string;
    range: string;
    priceType: string;
    data: HistoryPoint[];
  }>(API_ENDPOINTS.PRICE_HISTORY(metal, purity, currency, range), signal);
  if (result?.success !== true || result.metal !== metal || result.purity !== purity
    || result.currency !== currency || result.range !== range || result.priceType !== 'SIMULATED'
    || !Array.isArray(result.data) || result.data.length < 2
    || result.data.some(point => !point || !Number.isFinite(point.price) || Number.isNaN(Date.parse(point.timestamp)))) {
    throw new ApiError(ERROR_MESSAGES.INVALID_HISTORY, undefined, 'invalid-response');
  }
  return result.data;
}
