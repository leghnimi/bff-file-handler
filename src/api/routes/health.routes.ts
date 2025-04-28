import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { healthService } from '../../domain/services/health.service';
import { logger } from '../../infrastructure/logging';
import * as os from 'os';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const health = await healthService.getSystemHealth();

    const statusCode =
      health.status === 'healthy'
        ? StatusCodes.OK
        : health.status === 'degraded'
        ? StatusCodes.PARTIAL_CONTENT
        : StatusCodes.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Error retreiving system health', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'unhealthy',
      error: 'Failed to retreive system health',
      timestamp: Date.now(),
    });
  }
});

router.get('/details', async (req: Request, res: Response) => {
  try {
    const health = await healthService.getSystemHealth();
    
    const detailedHealth = {
      ...health,
      process: {
        pid: process.pid,
        version: process.version,
        memoryUsage: process.memoryUsage(),
        env: process.env.NODE_ENV
      },
      os: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime()
      }
    };
    
    const statusCode = 
      health.status === 'healthy' ? StatusCodes.OK : 
      health.status === 'degraded' ? StatusCodes.OK : 
      StatusCodes.SERVICE_UNAVAILABLE;
    
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    logger.error('Error retrieving detailed system health', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'unhealthy',
      error: 'Failed to retrieve detailed system health information',
      timestamp: Date.now()
    });
  }
});

export const healthRoutes = router;
