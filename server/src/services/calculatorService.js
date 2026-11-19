import messages from '../constants/messages.js';
import { getPriceByMetal } from './priceService.js';
import { convertWeightToGrams } from '../utils/weightConversion.js';

const DEFAULT_VAT_PERCENTAGE = 5;

function invalidRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizePurity(purity) {
  const value = typeof purity === 'number' || (typeof purity === 'string' && /^\d+$/.test(purity.trim()))
    ? Number(purity)
    : NaN;

  if (!Number.isInteger(value)) {
    throw invalidRequest(messages.error.UNSUPPORTED_PURITY);
  }

  return value;
}

function normalizeVatPercentage(includeVat, vatPercentage) {
  if (typeof includeVat !== 'boolean') {
    throw invalidRequest(messages.error.INVALID_INCLUDE_VAT);
  }

  if (vatPercentage !== undefined && (
    typeof vatPercentage !== 'number'
    || !Number.isFinite(vatPercentage)
    || vatPercentage < 0
    || vatPercentage > 100
  )) {
    throw invalidRequest(messages.error.INVALID_VAT_PERCENTAGE);
  }

  return includeVat ? (vatPercentage ?? DEFAULT_VAT_PERCENTAGE) : 0;
}

function roundMoney(amount) {
  if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER) {
    throw invalidRequest(messages.error.INVALID_WEIGHT);
  }
  return Number(amount.toFixed(2));
}

async function calculateBullion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw invalidRequest(messages.error.INVALID_REQUEST);
  }

  const {
    metal,
    purity,
    weight,
    weightUnit,
    currency,
    includeVat,
    vatPercentage,
  } = input;

  const selectedPurity = normalizePurity(purity);
  const appliedVatPercentage = normalizeVatPercentage(includeVat, vatPercentage);
  const convertedWeightInGrams = convertWeightToGrams(weight, weightUnit);

  // The existing price service validates metal/currency and performs currency conversion.
  const prices = await getPriceByMetal(metal, currency);
  const selectedPrice = prices.data.find((price) => price.fineness === selectedPurity);
  if (!selectedPrice) {
    throw invalidRequest(messages.error.UNSUPPORTED_PURITY);
  }

  // A customer quote uses the existing sell price per gram.
  const pricePerGram = selectedPrice.sellPrice;
  const baseAmount = roundMoney(pricePerGram * convertedWeightInGrams);
  const vatAmount = includeVat ? roundMoney(baseAmount * appliedVatPercentage / 100) : 0;
  const finalAmount = roundMoney(baseAmount + vatAmount);

  return {
    metal: selectedPrice.metal,
    purity: selectedPurity,
    originalWeight: weight,
    weightUnit: weightUnit.trim().toLowerCase(),
    convertedWeightInGrams,
    pricePerGram,
    currency: prices.currency,
    baseAmount,
    vatPercentage: appliedVatPercentage,
    vatAmount,
    finalAmount,
    priceType: selectedPrice.source,
  };
}

export { calculateBullion };
