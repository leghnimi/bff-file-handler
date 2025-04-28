import express, { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import { config } from '../../config';
import { logger } from '../../infrastructure/logging';

export const errorHandler: ErrorRequestHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    logger.warn(`Multer error caught for request ${req.method} ${req.originalUrl}: ${err.code} - ${err.message}`);
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(StatusCodes.REQUEST_TOO_LONG).json({
        message: `File too large. Maximum size allowed is ${config.maxFileSizeInBytes / 1024 / 1024}MB.`,
      });
      return;
    }

    res.status(StatusCodes.BAD_REQUEST).json({ message: `File upload error: ${err.message}` });
    return;
  }

  if (err.message === 'Invalid file type. Only CSV files are allowed.') {
    logger.warn(`Invalid file type rejected for request ${req.method} ${req.originalUrl}`);
    res.status(err.statusCode || StatusCodes.BAD_REQUEST).json({ message: err.message });
    return;
  }

  if (err.name === 'ValidationError' || (Array.isArray(err) && err.length > 0 && err[0].param)) {
    logger.warn(`Validation error for ${req.method} ${req.originalUrl}`);
    res.status(StatusCodes.BAD_REQUEST).json({ 
      message: 'Validation failed',
      errors: Array.isArray(err) ? err : err.errors
    });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn(`JWT error for ${req.method} ${req.originalUrl}: ${err.message}`);
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Authentication failed: ' + err.message });
    return;
  }

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  logger.error(`Unhandled Error: ${message}`, {
    status: statusCode,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] || 'unknown',
    stack: config.env === 'development' ? err.stack : undefined,
  });

  const errorResponse: any = {
    error: {
      message: statusCode === StatusCodes.INTERNAL_SERVER_ERROR && config.env !== 'development' 
        ? 'An unexpected error occurred.' 
        : message,
      code: err.code || 'INTERNAL_ERROR',
      status: statusCode
    }
  };

  if (config.env === 'development' && err.stack && statusCode !== StatusCodes.INTERNAL_SERVER_ERROR) {
    errorResponse.error.stack = err.stack.split('\n');
  }

  res.status(statusCode).json(errorResponse);
};