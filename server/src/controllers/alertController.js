import messages from '../constants/messages.js';
import * as alertService from '../services/alertService.js';

async function createAlert(req, res, next) {
  try {
    const data = await alertService.createAlert(req.body);
    res.status(201).json({ success: true, message: messages.success.ALERT_CREATED, data });
  } catch (error) {
    next(error);
  }
}

async function getAllAlerts(req, res, next) {
  try {
    const data = await alertService.getAllAlerts();
    res.status(200).json({ success: true, message: messages.success.ALERTS_RETRIEVED, data });
  } catch (error) {
    next(error);
  }
}

async function getAlertById(req, res, next) {
  try {
    const data = await alertService.getAlertById(req.params.id);
    res.status(200).json({ success: true, message: messages.success.ALERT_RETRIEVED, data });
  } catch (error) {
    next(error);
  }
}

async function updateAlert(req, res, next) {
  try {
    const data = await alertService.updateAlert(req.params.id, req.body);
    res.status(200).json({ success: true, message: messages.success.ALERT_UPDATED, data });
  } catch (error) {
    next(error);
  }
}

async function deleteAlert(req, res, next) {
  try {
    const data = await alertService.deleteAlert(req.params.id);
    res.status(200).json({ success: true, message: messages.success.ALERT_DELETED, data });
  } catch (error) {
    next(error);
  }
}

export { createAlert, getAllAlerts, getAlertById, updateAlert, deleteAlert };
