import messages from '../constants/messages.js';
import { convertPrice, getPriceReference } from './priceService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DECIMAL_PLACES = 4;

const ranges = Object.freeze({
  '1D': { durationMs: DAY_MS, intervals: 24, stepSize: 0.002 },
  '1W': { durationMs: 7 * DAY_MS, intervals: 42, stepSize: 0.003 },
  '1M': { durationMs: 30 * DAY_MS, intervals: 30, stepSize: 0.004 },
  '3M': { durationMs: 90 * DAY_MS, intervals: 45, stepSize: 0.006 },
  '1Y': { durationMs: 365 * DAY_MS, intervals: 52, stepSize: 0.009 },
});

function invalidRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parsePurity(purity) {
  if (typeof purity !== 'string' || !/^\d+$/.test(purity.trim())) {
    throw invalidRequest(messages.error.UNSUPPORTED_PURITY);
  }
  return Number(purity);
}

function seedFrom(selection) {
  let seed = 2166136261;
  for (const character of selection) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return seed;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function generatePrices(referencePriceAED, metal, purity, range, config) {
  const seed = seedFrom(`${metal}:${purity}:${range}`);
  const random = seededRandom(seed);
  const stepSize = config.stepSize * (metal === 'silver' ? 1.6 : 1);
  const prices = [referencePriceAED];

  for (let index = 1; index <= config.intervals; index += 1) {
    const randomMove = (random() * 2 - 1) * stepSize;
    const gentleCycle = Math.sin(index * 0.7 + seed % 10) * stepSize * 0.25;
    prices.push(prices[index - 1] * (1 + randomMove + gentleCycle));
  }

  // Scale the simulated path so its final point meets the current reference price.
  const anchor = referencePriceAED / prices[config.intervals];
  return prices.map((price, index) => index === config.intervals
    ? referencePriceAED
    : price * anchor);
}

async function getPriceHistory({ metal, purity, currency, range } = {}) {
  if (typeof metal !== 'string' || !metal.trim()) {
    throw invalidRequest(messages.error.UNSUPPORTED_METAL);
  }
  const selectedMetal = metal.trim().toLowerCase();
  const selectedPurity = parsePurity(purity);

  if (typeof currency !== 'string' || !currency.trim()) {
    throw invalidRequest(messages.error.UNSUPPORTED_CURRENCY);
  }
  const selectedCurrency = currency.trim().toUpperCase();

  if (typeof range !== 'string' || !Object.hasOwn(ranges, range.trim().toUpperCase())) {
    throw invalidRequest(messages.error.UNSUPPORTED_RANGE);
  }
  const selectedRange = range.trim().toUpperCase();
  const config = ranges[selectedRange];

  // Use the same unrounded AED reference and final two-decimal conversion as the price card.
  const selectedPrice = await getPriceReference(selectedMetal, selectedPurity, selectedCurrency);
  const simulatedPricesAED = generatePrices(
    selectedPrice.sellAED,
    selectedMetal,
    selectedPurity,
    selectedRange,
    config,
  );
  const generatedAt = new Date().toISOString();
  const quoteTimestamp = selectedPrice.spotUpdatedAt;
  const end = quoteTimestamp ? Date.parse(quoteTimestamp) : Date.parse(generatedAt);
  const start = end - config.durationMs;
  const data = simulatedPricesAED.map((priceAED, index) => ({
    timestamp: new Date(index === config.intervals
      ? end
      : start + Math.round(index * config.durationMs / config.intervals)).toISOString(),
    price: index === config.intervals
      ? selectedPrice.sellPrice
      : convertPrice(priceAED, selectedCurrency, HISTORY_DECIMAL_PLACES),
    timestampType: index === config.intervals
      ? quoteTimestamp ? 'PROVIDER_QUOTE' : 'GENERATED_REFERENCE'
      : 'SIMULATED',
  }));

  return {
    metal: selectedMetal,
    purity: selectedPurity,
    currency: selectedCurrency,
    range: selectedRange,
    unit: selectedPrice.unit,
    priceType: 'SIMULATED',
    spotSource: selectedPrice.source,
    spotUpdatedAt: quoteTimestamp,
    generatedAt,
    data,
  };
}

export { getPriceHistory };
