import { Router } from 'express';
import {
  createAlert,
  getAllAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
} from '../controllers/alertController.js';

const router = Router();

router.post('/', createAlert);
router.get('/', getAllAlerts);
router.get('/:id', getAlertById);
router.patch('/:id', updateAlert);
router.delete('/:id', deleteAlert);

export default router;
