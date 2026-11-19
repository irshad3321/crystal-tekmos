import { Router } from 'express';
import routes from '../constants/routes.js';
import { calculate } from '../controllers/calculatorController.js';

const router = Router();

router.post(routes.ROOT, calculate);

export default router;
