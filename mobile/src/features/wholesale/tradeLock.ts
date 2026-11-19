import { COPY } from '@/constants/copy';
import { whatsappDraftUrl } from '@/constants/links';
import type { Currency } from '@/constants/currencies';

export type GoldPurity = '24K' | '22K' | '21K' | '18K';

export const goldPurityOptions: readonly { id: string; purity: GoldPurity; label: string }[] = [
  { id: 'gold-24k', purity: '24K', label: COPY.TEXT_24K_PURE_GOLD },
  { id: 'gold-22k', purity: '22K', label: COPY.TEXT_22K_GOLD },
  { id: 'gold-21k', purity: '21K', label: COPY.TEXT_21K_GOLD },
  { id: 'gold-18k', purity: '18K', label: COPY.TEXT_18K_GOLD },
];

export function buildTradeLockUrl(details: {
  purity: GoldPurity;
  quantityGrams: number;
  currency: Currency;
  formattedEstimatedPrice: string;
}): string {
  const message = [
    COPY.WHATSAPP_GREETING,
    '',
    COPY.WHATSAPP_METAL,
    `${COPY.WHATSAPP_PURITY_LABEL} ${details.purity}`,
    `${COPY.WHATSAPP_QUANTITY_LABEL} ${details.quantityGrams} ${COPY.WHATSAPP_GRAMS}`,
    `${COPY.WHATSAPP_CURRENCY_LABEL} ${details.currency}`,
    `${COPY.WHATSAPP_ESTIMATED_PRICE_LABEL} ${details.formattedEstimatedPrice}`,
    '',
    COPY.WHATSAPP_ESTIMATE_NOTICE,
    COPY.WHATSAPP_CONFIRMATION_REQUEST,
  ].join('\n');

  return whatsappDraftUrl(message);
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
