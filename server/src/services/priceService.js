import currencies from '../constants/currencies.js';
import metals from '../constants/metals.js';
import messages from '../constants/messages.js';
import mockExchangeRates from '../utils/mockExchangeRates.js';
import mockPrices from '../utils/mockPrices.js';
import { getSpotSnapshot } from './goldApiService.js';

function invalidRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function currencyCode(requested = currencies.AED.code) {
  if (typeof requested !== 'string') {
    throw invalidRequest(`${messages.error.UNSUPPORTED_CURRENCY}: ${requested}`);
  }
  const code = requested.trim().toUpperCase();
  if (!Object.hasOwn(currencies, code) || !Object.hasOwn(mockExchangeRates, code)) {
    throw invalidRequest(`${messages.error.UNSUPPORTED_CURRENCY}: ${requested}`);
  }
  return code;
}

function metalCode(requested) {
  if (typeof requested !== 'string') {
    throw invalidRequest(`${messages.error.UNSUPPORTED_METAL}: ${requested}`);
  }
  const code = requested.trim().toUpperCase();
  if (!Object.hasOwn(metals, code)) {
    throw invalidRequest(`${messages.error.UNSUPPORTED_METAL}: ${requested}`);
  }
  return code;
}

function convertPrice(amountAED, requestedCurrency = currencies.AED.code, decimalPlaces = 2) {
  const currency = currencyCode(requestedCurrency);
  if (typeof amountAED !== 'number' || !Number.isFinite(amountAED) || amountAED < 0) {
    throw invalidRequest(messages.error.INVALID_REQUEST);
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 6) {
    throw invalidRequest(messages.error.INVALID_REQUEST);
  }
  return Number((amountAED * mockExchangeRates[currency]).toFixed(decimalPlaces));
}

function calculatePriceRows(prices, spots) {
  return prices.map((price) => {
    const spot = spots[price.metal];
    const spotAED = spot ? spot.usdPerGram / mockExchangeRates[currencies.USD.code] : null;
    const purityRatio = price.metal === 'gold' ? price.fineness / 999 : 1;
    const sellAED = spotAED === null ? price.sellPrice : spotAED * purityRatio;
    const buyAED = spotAED === null ? price.buyPrice : sellAED * price.buyPrice / price.sellPrice;
    return {
      metal: price.metal,
      purity: price.purity,
      fineness: price.fineness,
      buyAED,
      sellAED,
      source: spot?.source ?? 'SIMULATED_DEMO',
      spotUpdatedAt: spot?.updatedAt ?? null,
    };
  });
}

function formatPrices(prices, currency, spots) {
  const data = calculatePriceRows(prices, spots).map(({ buyAED, sellAED, ...price }) => ({
    ...price,
    buyPrice: convertPrice(buyAED, currency),
    sellPrice: convertPrice(sellAED, currency),
  }));
  const sources = new Set(data.map((price) => price.source));
  return {
    currency,
    unit: 'gram',
    source: sources.size === 1 ? data[0].source : 'MIXED',
    exchangeRateSource: 'SIMULATED_DEMO',
    data,
  };
}

async function getAllPrices(requestedCurrency) {
  const currency = currencyCode(requestedCurrency);
  return formatPrices(mockPrices, currency, await getSpotSnapshot());
}

async function getPriceByMetal(requestedMetal, requestedCurrency) {
  const metal = metalCode(requestedMetal);
  const currency = currencyCode(requestedCurrency);
  return formatPrices(mockPrices.filter((price) => price.metal === metal.toLowerCase()), currency, await getSpotSnapshot());
}

async function getPriceReference(requestedMetal, requestedPurity, requestedCurrency) {
  const metal = metalCode(requestedMetal);
  const currency = currencyCode(requestedCurrency);
  const rows = calculatePriceRows(
    mockPrices.filter((price) => price.metal === metal.toLowerCase()),
    await getSpotSnapshot(),
  );
  const selected = rows.find((price) => price.fineness === requestedPurity);
  if (!selected) throw invalidRequest(messages.error.UNSUPPORTED_PURITY);
  return {
    sellAED: selected.sellAED,
    sellPrice: convertPrice(selected.sellAED, currency),
    source: selected.source,
    spotUpdatedAt: selected.spotUpdatedAt,
    unit: 'gram',
  };
}

export { getAllPrices, getPriceByMetal, getPriceReference, convertPrice, currencyCode, metalCode };
