import { COPY } from '@/constants/copy';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import type { ApiPrice } from '@/api/prices';
import type { SpotRate } from '@/components/SpotRateCard';

const display: Record<string, Pick<SpotRate, 'id' | 'title' | 'subtitle' | 'purity'>> = {
  'gold:999': { id: 'gold-24k', title: COPY.GOLD_24K, subtitle: COPY.PURE_999, purity: '999' },
  'gold:916': { id: 'gold-22k', title: COPY.GOLD_22K, subtitle: COPY.JEWELLERY_STANDARD, purity: '916' },
  'gold:875': { id: 'gold-21k', title: COPY.GOLD_21K, subtitle: COPY.ARAB_STANDARD, purity: '875' },
  'gold:750': { id: 'gold-18k', title: COPY.GOLD_18K, subtitle: COPY.FASHION_STANDARD, purity: '750' },
  'silver:999': { id: 'silver-999', title: COPY.SILVER_999, subtitle: COPY.PURE_BULLION, purity: '999' },
};

export function mapPriceRates(prices: ApiPrice[]): SpotRate[] {
  return prices.map(price => {
    const metadata = display[`${price.metal}:${price.fineness}`];
    if (!metadata) throw new Error(ERROR_MESSAGES.UNSUPPORTED_RATE(price.metal, price.fineness));
    return {
      ...metadata,
      metal: price.metal,
      ask: price.sellPrice.toFixed(2),
      bid: price.buyPrice.toFixed(2),
      source: price.source,
    };
  });
}
