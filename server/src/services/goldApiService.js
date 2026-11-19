import messages from '../constants/messages.js';

const DEFAULT_BASE_URL = 'https://goldapi.dev/api/v1';
// Two metal requests every 90 seconds stay below GoldAPI's 100-request/hour Free limit.
const CACHE_MS = 90 * 1000;
// Leave time for the backend fallback before the mobile client's 10-second GET timeout.
const TIMEOUT_MS = 7000;
const TROY_OUNCE_GRAMS = 31.1034768;

const cache = { gold: null, silver: null };
let refreshAt = 0;
let inFlight = null;
let missingKeyWarned = false;

function readSpot(data, symbol) {
  if (!data || data.symbol !== symbol || data.currency !== 'USD' || data.unit !== 'oz'
    || typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price <= 0) {
    throw new Error(messages.error.INVALID_SPOT_RESPONSE);
  }
  if (symbol === 'XAU' && data.karat !== 24) throw new Error(messages.error.UNEXPECTED_GOLD_KARAT);
  const perGramFromOunce = data.price / TROY_OUNCE_GRAMS;
  const gram = data.gram;
  if (gram !== undefined && (typeof gram !== 'number' || !Number.isFinite(gram)
    || gram <= 0 || Math.abs(gram - perGramFromOunce) / perGramFromOunce > 0.005)) {
    throw new Error(messages.error.INCONSISTENT_SPOT_UNITS);
  }
  const timestamp = typeof data.updatedAt === 'string' && !Number.isNaN(Date.parse(data.updatedAt))
    ? new Date(data.updatedAt).toISOString() : null;
  return { usdPerGram: gram ?? perGramFromOunce, updatedAt: timestamp };
}

async function fetchSpot(symbol, apiKey, baseUrl) {
  const response = await fetch(`${baseUrl}/price/${symbol}/USD`, {
    headers: { 'X-API-Key': apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(messages.error.PROVIDER_HTTP(response.status));
  return readSpot(await response.json(), symbol);
}

async function refresh(apiKey) {
  const baseUrl = (process.env.GOLD_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const results = await Promise.allSettled([
    fetchSpot('XAU', apiKey, baseUrl),
    fetchSpot('XAG', apiKey, baseUrl),
  ]);
  for (const [index, metal] of ['gold', 'silver'].entries()) {
    if (results[index].status === 'fulfilled') {
      cache[metal] = results[index].value;
    } else {
      // Keep the last valid spot. Never log provider bodies or credentials.
      console.warn(messages.log.GOLD_API_UNAVAILABLE(metal));
    }
  }
  refreshAt = Date.now() + CACHE_MS;
  return results.map((result) => result.status === 'fulfilled');
}

async function getSpotSnapshot() {
  const apiKey = process.env.GOLD_API_KEY?.trim();
  if (!apiKey) {
    if (!missingKeyWarned) {
      console.warn(messages.log.GOLD_API_KEY_MISSING);
      missingKeyWarned = true;
    }
    return { gold: null, silver: null };
  }

  let fresh = [false, false];
  if (Date.now() >= refreshAt) {
    if (!inFlight) {
      inFlight = refresh(apiKey).finally(() => { inFlight = null; });
    }
    fresh = await inFlight;
  }
  return Object.fromEntries(['gold', 'silver'].map((metal, index) => [metal,
    cache[metal] ? { ...cache[metal], source: fresh[index] ? 'LIVE_SPOT' : 'CACHED_LIVE_SPOT' } : null,
  ]));
}

export { getSpotSnapshot };
