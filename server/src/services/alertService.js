import mongoose from 'mongoose';
import { alertConditions, alertStatuses } from '../constants/alerts.js';
import currencies from '../constants/currencies.js';
import metals from '../constants/metals.js';
import messages from '../constants/messages.js';
import Alert from '../models/Alert.js';
import { getPriceByMetal } from './priceService.js';

const inputFields = new Set(['metal', 'purity', 'currency', 'targetPrice', 'condition', 'status']);

function requestError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateInput(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw requestError(400, messages.error.INVALID_REQUEST);
  }
  const keys = Object.keys(input);
  if (keys.some((key) => !inputFields.has(key)) || (partial && keys.length === 0)) {
    throw requestError(400, messages.error.INVALID_REQUEST);
  }
}

function normalizeFields(input) {
  const metal = typeof input.metal === 'string' ? input.metal.trim().toLowerCase() : '';
  const metalDetails = metals[metal.toUpperCase()];
  if (!metalDetails) {
    throw requestError(400, messages.error.UNSUPPORTED_METAL);
  }

  const purity = typeof input.purity === 'number'
    || (typeof input.purity === 'string' && /^\d+$/.test(input.purity.trim()))
    ? Number(input.purity)
    : NaN;
  if (!Number.isInteger(purity) || !metalDetails.purities.some((item) => item.fineness === purity)) {
    throw requestError(400, messages.error.UNSUPPORTED_PURITY);
  }

  const currency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : '';
  if (!Object.hasOwn(currencies, currency)) {
    throw requestError(400, messages.error.UNSUPPORTED_CURRENCY);
  }

  const { targetPrice } = input;
  if (typeof targetPrice !== 'number' || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    throw requestError(400, messages.error.INVALID_TARGET_PRICE);
  }

  const condition = typeof input.condition === 'string' ? input.condition.trim().toLowerCase() : '';
  if (!alertConditions.includes(condition)) {
    throw requestError(400, messages.error.INVALID_ALERT_CONDITION);
  }

  return { metal, purity, currency, targetPrice, condition };
}

function normalizeWritableStatus(status) {
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (!alertStatuses.includes(normalized) || normalized === 'triggered') {
    throw requestError(400, messages.error.INVALID_ALERT_STATUS);
  }
  return normalized;
}

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw requestError(400, messages.error.INVALID_ALERT_ID);
  }
}

function requireDatabase() {
  if (Alert.db.readyState !== 1) {
    throw requestError(503, messages.error.DATABASE_UNAVAILABLE);
  }
}

function evaluate(fields) {
  // The existing price service owns currency conversion and supplies the demo sell rate.
  const price = getPriceByMetal(fields.metal, fields.currency).data.find(
    (item) => item.fineness === fields.purity,
  );
  const currentPrice = price.sellPrice;
  const conditionMet = fields.condition === 'above'
    ? currentPrice >= fields.targetPrice
    : currentPrice <= fields.targetPrice;
  return { currentPrice, conditionMet };
}

function toResponse(alert, evaluation) {
  return {
    id: String(alert._id),
    metal: alert.metal,
    purity: alert.purity,
    currency: alert.currency,
    targetPrice: alert.targetPrice,
    condition: alert.condition,
    status: alert.status,
    currentPrice: evaluation.currentPrice,
    conditionMet: evaluation.conditionMet,
    priceType: 'SIMULATED',
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  };
}

async function checkAndFormat(alert) {
  const evaluation = evaluate(alert);
  if (alert.status === 'active' && evaluation.conditionMet) {
    alert.status = 'triggered';
    await alert.save();
  }
  return toResponse(alert, evaluation);
}

async function createAlert(input) {
  validateInput(input);
  const fields = normalizeFields(input);
  const requestedStatus = input.status === undefined ? 'active' : normalizeWritableStatus(input.status);
  const evaluation = evaluate(fields);
  requireDatabase();

  const status = requestedStatus === 'active' && evaluation.conditionMet ? 'triggered' : requestedStatus;
  const alert = await Alert.create({ ...fields, status });
  return toResponse(alert, evaluation);
}

async function getAllAlerts() {
  requireDatabase();
  const alerts = await Alert.find().sort({ createdAt: -1 });
  const results = [];
  for (const alert of alerts) {
    results.push(await checkAndFormat(alert));
  }
  return results;
}

async function getAlertById(id) {
  validateId(id);
  requireDatabase();
  const alert = await Alert.findById(id);
  if (!alert) throw requestError(404, messages.error.ALERT_NOT_FOUND);
  return checkAndFormat(alert);
}

async function updateAlert(id, input) {
  validateId(id);
  validateInput(input, true);
  const validatedStatus = Object.hasOwn(input, 'status')
    ? normalizeWritableStatus(input.status)
    : undefined;
  requireDatabase();

  const alert = await Alert.findById(id);
  if (!alert) throw requestError(404, messages.error.ALERT_NOT_FOUND);

  const fields = normalizeFields({
    metal: alert.metal,
    purity: alert.purity,
    currency: alert.currency,
    targetPrice: alert.targetPrice,
    condition: alert.condition,
    ...input,
  });
  const criteriaChanged = Object.keys(fields).some((key) => fields[key] !== alert[key]);
  const requestedStatus = validatedStatus !== undefined
    ? validatedStatus
    : (criteriaChanged && alert.status === 'triggered' ? 'active' : alert.status);
  const evaluation = evaluate(fields);
  const status = requestedStatus === 'active' && evaluation.conditionMet ? 'triggered' : requestedStatus;

  Object.assign(alert, fields, { status });
  await alert.save();
  return toResponse(alert, evaluation);
}

async function deleteAlert(id) {
  validateId(id);
  requireDatabase();
  const alert = await Alert.findByIdAndDelete(id);
  if (!alert) throw requestError(404, messages.error.ALERT_NOT_FOUND);
  return { id: String(alert._id) };
}

export { createAlert, getAllAlerts, getAlertById, updateAlert, deleteAlert };
