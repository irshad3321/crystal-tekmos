import express from 'express';
import { reply } from '../controllers/aiController.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';
import routes from '../constants/routes.js';

const router = express.Router();

router.post(routes.CHAT, aiRateLimit, reply);

export default router;
