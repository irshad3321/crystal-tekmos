export const EXTERNAL_LINKS = {
  GOLD_API: 'https://goldapi.dev',
  WHATSAPP_BASE: 'https://wa.me',
} as const;

export const WHATSAPP_BUSINESS_NUMBER = '919539992199';

export function whatsappDraftUrl(message: string): string {
  return `${EXTERNAL_LINKS.WHATSAPP_BASE}/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`;
}
