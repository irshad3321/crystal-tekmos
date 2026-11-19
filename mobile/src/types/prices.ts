import type { Currency } from '@/constants/currencies';
import type { MetalRate } from '@/constants/mockRates';

export type PriceSource = 'LIVE_SPOT' | 'CACHED_LIVE_SPOT' | 'SIMULATED_DEMO';

export type ApiPrice = {
  metal: 'gold' | 'silver';
  purity: string;
  fineness: number;
  buyPrice: number;
  sellPrice: number;
  source: PriceSource;
  spotUpdatedAt: string | null;
};

export type PricesResponse = {
  success: true;
  message: string;
  currency: Currency;
  unit: 'gram';
  source: PriceSource | 'MIXED';
  exchangeRateSource: 'SIMULATED_DEMO';
  data: ApiPrice[];
};

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y';
export type HistoryPoint = {
  timestamp: string;
  price: number;
  timestampType?: 'SIMULATED' | 'PROVIDER_QUOTE' | 'GENERATED_REFERENCE';
};

export type SpotRate = Pick<MetalRate, 'id' | 'title' | 'subtitle' | 'purity' | 'ask' | 'bid' | 'metal'>
  & Partial<Pick<MetalRate, 'low' | 'high'>> & { source?: PriceSource };
