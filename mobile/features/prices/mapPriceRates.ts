import type { ApiPrice } from '@/api/prices';
import type { SpotRate } from '@/components/SpotRateCard';

const display: Record<string, Pick<SpotRate, 'id' | 'title' | 'subtitle' | 'purity'>> = {
  'gold:999': { id: 'gold-24k', title: 'GOLD 24K', subtitle: 'Pure 999', purity: '999' },
  'gold:916': { id: 'gold-22k', title: 'GOLD 22K', subtitle: 'Jewellery Standard', purity: '916' },
  'gold:875': { id: 'gold-21k', title: 'GOLD 21K', subtitle: 'Arab Standard', purity: '875' },
  'gold:750': { id: 'gold-18k', title: 'GOLD 18K', subtitle: 'Fashion Standard', purity: '750' },
  'silver:999': { id: 'silver-999', title: 'SILVER 999', subtitle: 'Pure Bullion', purity: '999' },
};

export function mapPriceRates(prices: ApiPrice[]): SpotRate[] {
  return prices.map(price => {
    const metadata = display[`${price.metal}:${price.fineness}`];
    if (!metadata) throw new Error(`Unsupported Crystal rate: ${price.metal} ${price.fineness}`);
    return {
      ...metadata,
      metal: price.metal,
      ask: price.sellPrice.toFixed(2),
      bid: price.buyPrice.toFixed(2),
      source: price.source,
    };
  });
}
