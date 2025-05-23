import { Request, Response, NextFunction, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../../infrastructure/multer.config';
import { logger } from '../../infrastructure/logging';
import { dynamicRateLimiterService } from '../../domain/services/dynamicRateLimiter.service';
import pLimit from 'p-limit';
import { createResilientFunction } from '../../infrastructure/resilience';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload and management endpoints
 */

const concurrencyLimiter = pLimit(config.maxConcurrentUploads);

const uploadLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: async (req: Request, res: Response) => {
    try {
      const limit = await dynamicRateLimiterService.getCurrentLimit();
      return limit;
    } catch (error) {
      logger.error('failed to get current limit falling back to default', error);
      return config.rateLimitMax;
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: StatusCodes.TOO_MANY_REQUESTS,
    message:
      'Server is currently busy, or too many upload requests received. Please try again later.',
  },
  keyGenerator: (req: Request, res: Response): string => {
    return req.user?.id || req.ip || 'unknown-key';
  },
  handler: async (req, res, next, options) => {
    let appliedLimit = config.rateLimitMax;
    try {
      appliedLimit = await dynamicRateLimiterService.getCurrentLimit();
    } catch (error) {
      logger.error('Failed to get dynamic limit in rate limit handler:', error);
    }

    logger.warn(
      `Rate limit exceeded for key ${
        req.user?.id || req.ip || 'unknown-key'
      }. Limit: ${appliedLimit}, Window: ${options.windowMs}ms`,
    );
    res.status(options.statusCode).json(options.message);
  },
});

router.use(authenticate);

async function processFile(file: Express.Multer.File, userId: string) {
  logger.info(`Processing file ${file.filename} for user ${userId}`);

  // // Simulate random failures (50% chance)
  // if (Math.random() < 0.5) {
  //   const error = new Error('Temporary network issue');
  //   error.name = 'NetworkError';
  //   throw error;
  // }

  // // Always fail
  // throw new Error('Service unavailable');

  await new Promise((resolve) => setTimeout(resolve, 1000));
  logger.info(`Finished processing file ${file.filename}`);
  return {
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    processed: true,
  };
}

const resilientProcessFile = createResilientFunction(processFile, {
  retry: {
    maxRetries: 3,
    initialDelayMs: 200,
    maxDelayMs: 2000,
    backoffFactor: 1.5,
    retryableErrors: ['timeout', 'connection', /network/i, /temporary/i],
  },
  circuitBreaker: {
    resetTimeout: 10000,
    errorThresholdPercentage: 50,
    rollingCountTimeout: 30000,
  },
  fallbackValue: async (file: Express.Multer.File, userId: string) => {
    logger.warn(`Using fallback for file ${file.filename} (user: ${userId})`);
    return {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      processed: false,
      error: 'Processing failed, file will be processed later',
    };
  },
});

/**
 * @swagger
 * /files:
 *   post:
 *     summary: Upload multiple files for processing
 *     description: Upload one or more files for processing. Files are processed asynchronously with resilience patterns.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload (maximum of 5 files)
 *     responses:
 *       201:
 *         description: Files uploaded successfully and processing started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 3 files uploaded successfully. Processing started.
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                         description: Server-generated filename
 *                       originalname:
 *                         type: string
 *                         description: Original filename
 *                       size:
 *                         type: number
 *                         description: File size in bytes
 *                       processed:
 *                         type: boolean
 *                         description: Whether the file was processed successfully
 *                       error:
 *                         type: string
 *                         description: Error message if processing failed
 *                 failed:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       description: Number of files that failed processing
 *                     message:
 *                       type: string
 *                       description: Information about failed files
 *       400:
 *         description: No files uploaded or invalid request
 *       401:
 *         description: Unauthorized - authentication required
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Server error during file processing
 */

router.post(
  '/',
  uploadLimiter,
  upload.array('file', config.maxConcurrentUploads),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      logger.warn(`File upload request completed without req.files for user ${req.user?.id}`);
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'No files uploaded.' });
      return;
    }

    const uploadedFiles = req.files as Express.Multer.File[];
    const userId = req.user?.id || 'unknown';

    try {
      const processingPromises = uploadedFiles.map((file) =>
        concurrencyLimiter(async () => {
          return resilientProcessFile(file, userId);
        }),
      );

      const processingResults = await Promise.all(processingPromises);

      const failedFiles = processingResults.filter((result) => !result.processed);

      logger.info(
        `${uploadedFiles.length} files uploaded and processing initiated by user ${userId}. ` +
          `${failedFiles.length} files had processing issues.`,
      );

      res.status(StatusCodes.CREATED).json({
        message: `${uploadedFiles.length} files uploaded successfully. Processing started.`,
        results: processingResults,
        failed:
          failedFiles.length > 0
            ? {
                count: failedFiles.length,
                message: 'Some files will be processed in background queue',
              }
            : undefined,
      });
    } catch (error) {
      logger.error(
        `Error processing uploaded files for user ${req.user?.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      next(error);
    }
  },
);

/**
 * @swagger
 * /files:
 *   get:
 *     summary: List files uploaded by the user
 *     description: Retrieves a list of files that the authenticated user has uploaded (not implemented yet)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: This endpoint is not implemented yet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Not implemented yet
 *                 user:
 *                   type: object
 *                   description: Current authenticated user info
 *       401:
 *         description: Unauthorized - authentication required
 */

router.get('/', (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemented yet', user: req.user });
});

export const fileRoutes = router;
