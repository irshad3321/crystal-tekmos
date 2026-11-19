import { Router } from 'express';
import routes from '../constants/routes.js';
import { getHistory } from '../controllers/priceHistoryController.js';

const router = Router();

router.get(routes.ROOT, getHistory);

export default router;
