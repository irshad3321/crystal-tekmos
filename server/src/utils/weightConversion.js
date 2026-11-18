import messages from '../constants/messages.js';

const gramsPerUnit = Object.freeze({
  gram: 1,
  tola: 11.6638,
  ounce: 31.1035,
  kilogram: 1000,
});

function convertWeightToGrams(weight, weightUnit) {
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
    const error = new Error(messages.error.INVALID_WEIGHT);
    error.statusCode = 400;
    throw error;
  }

  const unit = typeof weightUnit === 'string' ? weightUnit.trim().toLowerCase() : '';
  if (!Object.hasOwn(gramsPerUnit, unit)) {
    const error = new Error(`${messages.error.UNSUPPORTED_WEIGHT_UNIT}: ${weightUnit}`);
    error.statusCode = 400;
    throw error;
  }

  const grams = weight * gramsPerUnit[unit];
  if (!Number.isFinite(grams)) {
    const error = new Error(messages.error.INVALID_WEIGHT);
    error.statusCode = 400;
    throw error;
  }

  return grams;
}

export { convertWeightToGrams };
