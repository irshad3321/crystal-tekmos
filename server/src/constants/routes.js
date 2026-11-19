const routes = Object.freeze({
  api: Object.freeze({
    HEALTH: '/api/health',
    PRICE_HISTORY: '/api/prices/history',
    PRICES: '/api/prices',
    CALCULATOR: '/api/calculator',
    ALERTS: '/api/alerts',
    AI: '/api/ai',
  }),
  ROOT: '/',
  CHAT: '/chat',
  ALERT_BY_ID: '/:id',
  PRICE_BY_METAL: '/:metal',
});

export default routes;
