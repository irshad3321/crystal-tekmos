import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import priceHistoryRoutes from './routes/priceHistoryRoutes.js';
import calculatorRoutes from './routes/calculatorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/prices/history', priceHistoryRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/alerts', alertRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
