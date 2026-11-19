import { Router } from 'express';
import { getHistory } from '../controllers/priceHistoryController.js';

const router = Router();

router.get('/', getHistory);

export default router;
