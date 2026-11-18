import mongoose from 'mongoose';
import { alertConditions, alertStatuses } from '../constants/alerts.js';
import currencies from '../constants/currencies.js';
import metals from '../constants/metals.js';
import messages from '../constants/messages.js';

const alertSchema = new mongoose.Schema({
  metal: {
    type: String,
    required: true,
    enum: Object.values(metals).map((metal) => metal.code.toLowerCase()),
  },
  purity: {
    type: Number,
    required: true,
    validate: {
      validator(value) {
        return metals[this.metal?.toUpperCase()]?.purities.some(
          (purity) => purity.fineness === value,
        ) ?? false;
      },
      message: messages.error.UNSUPPORTED_PURITY,
    },
  },
  currency: {
    type: String,
    required: true,
    enum: Object.keys(currencies),
  },
  targetPrice: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => Number.isFinite(value) && value > 0,
      message: messages.error.INVALID_TARGET_PRICE,
    },
  },
  condition: {
    type: String,
    required: true,
    enum: alertConditions,
  },
  status: {
    type: String,
    required: true,
    enum: alertStatuses,
    default: 'active',
  },
}, { timestamps: true });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
