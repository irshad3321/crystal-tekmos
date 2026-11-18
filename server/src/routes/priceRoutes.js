import { Router } from 'express';
import { getAllPrices, getPriceByMetal } from '../controllers/priceController.js';

const router = Router();

router.get('/', getAllPrices);
router.get('/:metal', getPriceByMetal);

export default router;
