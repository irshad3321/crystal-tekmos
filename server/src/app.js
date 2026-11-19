import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import priceHistoryRoutes from './routes/priceHistoryRoutes.js';
import calculatorRoutes from './routes/calculatorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import routes from './constants/routes.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

app.use(routes.api.HEALTH, healthRoutes);
app.use(routes.api.PRICE_HISTORY, priceHistoryRoutes);
app.use(routes.api.PRICES, priceRoutes);
app.use(routes.api.CALCULATOR, calculatorRoutes);
app.use(routes.api.ALERTS, alertRoutes);
app.use(routes.api.AI, aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
