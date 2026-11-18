import express from 'express';
import messages from '../constants/messages.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'crystal-bullion-server',
    message: messages.success.HEALTH,
  });
});

export default router;
