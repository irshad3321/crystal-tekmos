import messages from '../constants/messages.js';
import * as priceService from '../services/priceService.js';

function sendPrices(res, result) {
  res.status(200).json({
    success: true,
    message: messages.success.PRICES_RETRIEVED,
    ...result,
  });
}

async function getAllPrices(req, res, next) {
  try {
    sendPrices(res, await priceService.getAllPrices(req.query.currency));
  } catch (error) {
    next(error);
  }
}

async function getPriceByMetal(req, res, next) {
  try {
    sendPrices(res, await priceService.getPriceByMetal(req.params.metal, req.query.currency));
  } catch (error) {
    next(error);
  }
}

export { getAllPrices, getPriceByMetal };
