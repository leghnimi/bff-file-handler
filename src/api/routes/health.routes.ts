import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { healthService } from '../../domain/services/health.service';
import { logger } from '../../infrastructure/logging';
import * as os from 'os';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: API health check endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns the basic health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                   enum: [healthy, degraded, unhealthy]
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 timestamp:
 *                   type: number
 *                   description: Current timestamp in milliseconds
 *                 dependencies:
 *                   type: object
 *                   description: Status of system dependencies
 *       206:
 *         description: System is in degraded state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: degraded
 *                   enum: [degraded]
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 timestamp:
 *                   type: number
 *                   description: Current timestamp in milliseconds
 *                 dependencies:
 *                   type: object
 *                   description: Status of system dependencies
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                   enum: [unhealthy]
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 timestamp:
 *                   type: number
 *                   description: Current timestamp in milliseconds
 *                 dependencies:
 *                   type: object
 *                   description: Status of system dependencies
 *       500:
 *         description: Error retrieving system health
 */

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


/**
 * @swagger
 * /health/details:
 *   get:
 *     summary: Detailed health check
 *     description: Returns detailed health information about the API, including process and OS details
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                   enum: [healthy, degraded, unhealthy]
 *                 uptime:
 *                   type: number
 *                   description: Application uptime in seconds
 *                 timestamp:
 *                   type: number
 *                   description: Current timestamp in milliseconds
 *                 dependencies:
 *                   type: object
 *                   description: Status of system dependencies
 *                 process:
 *                   type: object
 *                   properties:
 *                     pid:
 *                       type: number
 *                       description: Process ID
 *                     version:
 *                       type: string
 *                       description: Node.js version
 *                     memoryUsage:
 *                       type: object
 *                       description: Memory usage statistics
 *                     env:
 *                       type: string
 *                       description: Current environment
 *                 os:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       description: Operating system type
 *                     platform:
 *                       type: string
 *                       description: Platform identifier
 *                     arch:
 *                       type: string
 *                       description: Architecture
 *                     release:
 *                       type: string
 *                       description: OS release version
 *                     uptime:
 *                       type: number
 *                       description: System uptime in seconds
 *       503:
 *         description: System is unhealthy
 *       500:
 *         description: Error retrieving detailed system health
 */

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
