import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './infrastructure/logging';
import { apiRoutes } from './api/routes';
import { errorHandler } from './api/middlewares/error.middleware';
import { requestLogger } from './api/middlewares/requestLogger.middleware';
import { setupSwagger } from './swagger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
setupSwagger(app);
app.use('/api/v1', apiRoutes);
app.use(errorHandler);

const PORT = config.port || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.env} mode`);
  });
}

export default app;
