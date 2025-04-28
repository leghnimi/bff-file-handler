import express from 'express';
import { StatusCodes } from 'http-status-codes';

const router = express.Router();

// To implemant later
router.post('/login', (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemanted yet' });
});

router.post('/register', (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({ message: 'Not implemanted yet' });
});

export const authRoutes = router;