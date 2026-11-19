import type { Currency } from '@/constants/currencies';

export type GoldPurity = '24K' | '22K' | '21K' | '18K';

export const goldPurityOptions: readonly { id: string; purity: GoldPurity; label: string }[] = [
  { id: 'gold-24k', purity: '24K', label: '24K Pure Gold' },
  { id: 'gold-22k', purity: '22K', label: '22K Gold' },
  { id: 'gold-21k', purity: '21K', label: '21K Gold' },
  { id: 'gold-18k', purity: '18K', label: '18K Gold' },
];

const WHATSAPP_BUSINESS_NUMBER = '919539992199';

export function buildTradeLockUrl(details: {
  purity: GoldPurity;
  quantityGrams: number;
  currency: Currency;
  formattedEstimatedPrice: string;
}): string {
  const message = [
    'Hello! I am interested in a gold wholesale purchase.',
    '',
    'Metal: Gold',
    `Purity: ${details.purity}`,
    `Quantity: ${details.quantityGrams} grams`,
    `Currency: ${details.currency}`,
    `Estimated Price: ${details.formattedEstimatedPrice}`,
    '',
    'This is an estimate only; no order is locked.',
    'Please confirm the latest rate, availability and final order price.',
  ].join('\n');

  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function openTradeLockLink(url: string, linking: {
  canOpenURL: (value: string) => Promise<boolean>;
  openURL: (value: string) => Promise<unknown>;
}): Promise<boolean> {
  // Android and iOS may reject handler queries even when an HTTPS link can open.
  const canOpen = await linking.canOpenURL(url).catch(() => true);
  if (!canOpen) return false;
  await linking.openURL(url);
  return true;
}
