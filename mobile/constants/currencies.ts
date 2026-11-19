export const currencies = {
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  USD: { symbol: '$', name: 'US Dollar' },
  OMR: { symbol: 'ر.ع.', name: 'Omani Rial' },
  SAR: { symbol: 'ر.س', name: 'Saudi Riyal' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
} as const;

export type Currency = keyof typeof currencies;
export const currencyCodes = Object.keys(currencies) as Currency[];

export function formatCurrency(value: number | string, currency: Currency, language: 'en' | 'ar' = 'en', decimals = 2): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(amount)) return String(value);
  const locale = currency === 'INR'
    ? (language === 'ar' ? 'en-IN-u-nu-arab' : 'en-IN')
    : (language === 'ar' ? 'ar-AE-u-nu-arab' : 'en-US');
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(currency === 'INR' ? Math.abs(amount) : amount);
  return currency === 'INR' ? `${amount < 0 ? '-' : ''}${currencies.INR.symbol}${formatted}` : `${formatted} ${currency}`;
}
