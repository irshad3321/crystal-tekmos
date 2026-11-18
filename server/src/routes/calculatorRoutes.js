import { Router } from 'express';
import { calculate } from '../controllers/calculatorController.js';

const router = Router();

router.post('/', calculate);

export default router;
