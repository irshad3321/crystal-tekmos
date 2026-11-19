import { ApiError, getJson } from './client';
import type { Currency } from '@/constants/currencies';

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y';
export type HistoryPoint = { timestamp: string; price: number; timestampType?: 'SIMULATED' | 'PROVIDER_QUOTE' | 'GENERATED_REFERENCE' };

export async function fetchPriceHistory(metal: 'gold' | 'silver', purity: number, currency: Currency, range: HistoryRange, signal?: AbortSignal): Promise<HistoryPoint[]> {
  const result = await getJson<{
    success: boolean;
    metal: string;
    purity: number;
    currency: string;
    range: string;
    priceType: string;
    data: HistoryPoint[];
  }>(`/api/prices/history?metal=${metal}&purity=${purity}&currency=${currency}&range=${range}`, signal);
  if (result?.success !== true || result.metal !== metal || result.purity !== purity
    || result.currency !== currency || result.range !== range || result.priceType !== 'SIMULATED'
    || !Array.isArray(result.data) || result.data.length < 2
    || result.data.some(point => !point || !Number.isFinite(point.price) || Number.isNaN(Date.parse(point.timestamp)))) {
    throw new ApiError('Crystal API returned invalid price history.', undefined, 'invalid-response');
  }
  return result.data;
}
