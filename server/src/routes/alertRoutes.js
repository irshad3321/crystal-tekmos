import { Router } from 'express';
import routes from '../constants/routes.js';
import {
  createAlert,
  getAllAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
} from '../controllers/alertController.js';

const router = Router();

router.post(routes.ROOT, createAlert);
router.get(routes.ROOT, getAllAlerts);
router.get(routes.ALERT_BY_ID, getAlertById);
router.patch(routes.ALERT_BY_ID, updateAlert);
router.delete(routes.ALERT_BY_ID, deleteAlert);

export default router;
