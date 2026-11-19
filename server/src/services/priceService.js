import currencies from '../constants/currencies.js';
import metals from '../constants/metals.js';
import messages from '../constants/messages.js';
import mockExchangeRates from '../utils/mockExchangeRates.js';
import mockPrices from '../utils/mockPrices.js';

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

function formatPrices(prices, currency) {
  return {
    currency,
    unit: 'gram',
    source: 'SIMULATED_DEMO',
    data: prices.map((price) => ({
      metal: price.metal,
      purity: price.purity,
      fineness: price.fineness,
      buyPrice: convertPrice(price.buyPrice, currency),
      sellPrice: convertPrice(price.sellPrice, currency),
    })),
  };
}

function getAllPrices(requestedCurrency) {
  const currency = currencyCode(requestedCurrency);
  return formatPrices(mockPrices, currency);
}

function getPriceByMetal(requestedMetal, requestedCurrency) {
  const metal = metalCode(requestedMetal);
  const currency = currencyCode(requestedCurrency);
  return formatPrices(mockPrices.filter((price) => price.metal === metal.toLowerCase()), currency);
}

export { getAllPrices, getPriceByMetal, convertPrice };
