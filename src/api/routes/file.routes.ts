import express from 'express';
import { StatusCodes } from 'http-status-codes';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  standardHeaders: true,
  message: { 
    status: StatusCodes.TOO_MANY_REQUESTS, 
    message: 'Too many requests, please try again later.' 
  }
});

// To implemant later 
router.post('/', uploadLimiter, (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemented yet' });
});

router.get('/', (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemented yet' });
});

export const fileRoutes = router;