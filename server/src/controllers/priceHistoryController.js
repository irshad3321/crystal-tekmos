import messages from '../constants/messages.js';
import { getPriceHistory } from '../services/priceHistoryService.js';

function getHistory(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      message: messages.success.PRICE_HISTORY_RETRIEVED,
      ...getPriceHistory(req.query),
    });
  } catch (error) {
    next(error);
  }
}

export { getHistory };
