import messages from '../constants/messages.js';
import { calculateBullion } from '../services/calculatorService.js';

function calculate(req, res, next) {
  try {
    const result = calculateBullion(req.body);
    res.status(200).json({
      success: true,
      message: messages.success.CALCULATION_COMPLETED,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export { calculate };
