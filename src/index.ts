import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { StatusCodes } from 'http-status-codes';
import { config } from './config';
import { logger } from './infrastructure/logging';
import { apiRoutes } from './api/routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use('/api/v1', apiRoutes);

app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: {
      message: 'Internal Server Error',
      id: req.headers['x-request-id'] || 'unknown'
    },
  });
});

const PORT = config.port || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.env} mode`);
  });
}

export default app;