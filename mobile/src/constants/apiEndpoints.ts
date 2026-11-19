// Keep backend paths in one place, as in the reference app's API layer.
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AI_CHAT: '/api/ai/chat',
  PRICES: (currency: string) => `/api/prices?currency=${encodeURIComponent(currency)}`,
  PRICE_HISTORY: (metal: string, purity: number, currency: string, range: string) =>
    `/api/prices/history?metal=${encodeURIComponent(metal)}&purity=${purity}&currency=${encodeURIComponent(currency)}&range=${encodeURIComponent(range)}`,
} as const;
