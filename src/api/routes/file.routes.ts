import { Request, Response, NextFunction, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../../infrastructure/multer.config';
import { logger } from '../../infrastructure/logging';
import { dynamicRateLimiterService } from '../../domain/services/dynamicRateLimiter.service';
import pLimit from 'p-limit';

const router = Router();

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

    try {
      const processingPromises = uploadedFiles.map((file) =>
        concurrencyLimiter(async () => {
          logger.info(`Processing file ${file.filename} for user ${req.user?.id}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          logger.info(`Finished processing file ${file.filename}`);
          return {
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            processed: true,
          };
        }),
      );

      const processingResults = await Promise.all(processingPromises);

      logger.info(
        `${uploadedFiles.length} files uploaded and processing initiated by user ${req.user?.id}`,
      );
      res.status(StatusCodes.CREATED).json({
        message: `${uploadedFiles.length} files uploaded successfully. Processing started.`,
        results: processingResults,
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

router.get('/', (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemented yet', user: req.user });
});

export const fileRoutes = router;
