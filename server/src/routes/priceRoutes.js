import { Router } from 'express';
import routes from '../constants/routes.js';
import { getAllPrices, getPriceByMetal } from '../controllers/priceController.js';

const router = Router();

router.get(routes.ROOT, getAllPrices);
router.get(routes.PRICE_BY_METAL, getPriceByMetal);

export default router;
