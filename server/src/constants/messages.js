const messages = Object.freeze({
  success: Object.freeze({
    HEALTH: 'Server is running',
    PRICES_RETRIEVED: 'Prices retrieved successfully',
    PRICE_HISTORY_RETRIEVED: 'Price history retrieved successfully',
    CALCULATION_COMPLETED: 'Calculation completed successfully',
    ALERT_CREATED: 'Alert created successfully',
    ALERTS_RETRIEVED: 'Alerts retrieved successfully',
    ALERT_RETRIEVED: 'Alert retrieved successfully',
    ALERT_UPDATED: 'Alert updated successfully',
    ALERT_DELETED: 'Alert deleted successfully',
  }),
  error: Object.freeze({
    NOT_FOUND: 'Route not found',
    INVALID_REQUEST: 'Invalid request',
    UNSUPPORTED_CURRENCY: 'Unsupported currency',
    UNSUPPORTED_METAL: 'Unsupported metal',
    UNSUPPORTED_PURITY: 'Unsupported purity for this metal',
    UNSUPPORTED_RANGE: 'Unsupported history range',
    UNSUPPORTED_WEIGHT_UNIT: 'Unsupported weight unit',
    INVALID_WEIGHT: 'Weight must be a positive finite number',
    INVALID_INCLUDE_VAT: 'includeVat must be a boolean',
    INVALID_VAT_PERCENTAGE: 'vatPercentage must be a number from 0 to 100',
    INVALID_TARGET_PRICE: 'targetPrice must be a positive finite number',
    INVALID_ALERT_CONDITION: 'Condition must be above or below',
    INVALID_ALERT_STATUS: 'Status must be active or inactive; triggered is calculated automatically',
    INVALID_ALERT_ID: 'Invalid alert ID',
    ALERT_NOT_FOUND: 'Alert not found',
    DATABASE_UNAVAILABLE: 'Alert storage is unavailable',
    INTERNAL_SERVER_ERROR: 'Internal server error',
  }),
});

export default messages;
