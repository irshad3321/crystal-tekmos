import { getJson, ApiError } from './client';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type { Currency } from '@/constants/currencies';
import type { ApiPrice, PricesResponse } from '@/types/prices';

export type { Currency } from '@/constants/currencies';
export type { ApiPrice, PricesResponse, PriceSource } from '@/types/prices';

const inFlight = new Map<Currency, Promise<PricesResponse>>();

function isApiPrice(value: unknown): value is ApiPrice {
  if (!value || typeof value !== 'object') return false;
  const price = value as Partial<ApiPrice>;
  return (price.metal === 'gold' || price.metal === 'silver')
    && typeof price.purity === 'string'
    && typeof price.fineness === 'number'
    && Number.isFinite(price.fineness)
    && typeof price.buyPrice === 'number'
    && Number.isFinite(price.buyPrice)
    && typeof price.sellPrice === 'number'
    && Number.isFinite(price.sellPrice)
    && ['LIVE_SPOT', 'CACHED_LIVE_SPOT', 'SIMULATED_DEMO'].includes(price.source ?? '')
    && (price.spotUpdatedAt === null || typeof price.spotUpdatedAt === 'string');
}

export function fetchPrices(currency: Currency): Promise<PricesResponse> {
  const existing = inFlight.get(currency);
  if (existing) return existing;

  const request = getJson<unknown>(API_ENDPOINTS.PRICES(currency))
    .then(value => {
      if (!value || typeof value !== 'object') throw new ApiError(ERROR_MESSAGES.INVALID_PRICES);
      const result = value as Partial<PricesResponse>;
      if (result.success !== true || result.currency !== currency || result.unit !== 'gram'
        || !['LIVE_SPOT', 'CACHED_LIVE_SPOT', 'SIMULATED_DEMO', 'MIXED'].includes(result.source ?? '')
        || !Array.isArray(result.data) || result.data.length === 0
        || !result.data.every(isApiPrice)) {
        throw new ApiError(ERROR_MESSAGES.INVALID_PRICES);
      }
      return result as PricesResponse;
    })
    .finally(() => { inFlight.delete(currency); });

  inFlight.set(currency, request);
  return request;
}
