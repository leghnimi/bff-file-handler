import express, { Request, Response, NextFunction, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../../infrastructure/multer.config';
import { logger } from '../../infrastructure/logging';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Too many upload requests, please try again later.',
  },
});

router.use(authenticate);

router.post(
  '/',
  uploadLimiter,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      logger.warn(`File upload request completed without req.file for user ${req.user?.id}`);
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'No file uploaded or file rejected.' });
      return;
    }

    try {
      logger.info(`File uploaded successfully by user ${req.user?.id}: ${req.file.filename}`);
      res.status(StatusCodes.CREATED).json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      logger.error(
        `Error processing uploaded file ${req.file?.filename} for user ${req.user?.id}: ${
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
