import currencies from '../constants/currencies.js';

// Illustrative amount of each currency per 1 AED. These are not live FX rates.
const mockExchangeRates = Object.freeze({
  [currencies.AED.code]: 1,
  [currencies.USD.code]: 0.2723,
  [currencies.OMR.code]: 0.1047,
  [currencies.SAR.code]: 1.021,
  [currencies.INR.code]: 24.6,
});

export default mockExchangeRates;
