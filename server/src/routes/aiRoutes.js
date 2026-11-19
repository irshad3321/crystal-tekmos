import express from 'express';
import { reply } from '../controllers/aiController.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';

const router = express.Router();

router.post('/chat', aiRateLimit, reply);

export default router;
