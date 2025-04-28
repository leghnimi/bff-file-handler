import express from 'express';
import { StatusCodes } from 'http-status-codes';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { authenticate } from '../middlewares/auth.middleware';

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

router.use(authenticate)

// To implemant later 
router.post('/', uploadLimiter, (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemented yet', user: req.user });
});

router.get('/', (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemented yet', user: req.user });
});

export const fileRoutes = router;