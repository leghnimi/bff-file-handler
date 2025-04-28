import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthenticationError, authService } from '../../domain/services/auth.service';
import { logger } from '../../infrastructure/logging';

const router = express.Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'username & password are required' });
      return;
    }
    const token = await authService.login({ username, password });

    res.status(StatusCodes.OK).json({ message: 'successful login', token });
    return;
  } catch (error) {
    logger.error(`login error: ${error instanceof Error ? error.message : 'unknown error'}`);
    if (error instanceof AuthenticationError) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: error.message });
      return;
    }
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: 'Error occured when logging in' });
  }
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: 'Username, password and email are required for registration' });
      return;
    }

    // todo:  implement validation schema 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid email format' });
      return;
    }

    // todo:  implement validation schema
    if (password.length < 8) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: 'Password must be at least 8 characters long' });
      return;
    }

    const user = await authService.register(username, email, password);

    res.status(StatusCodes.CREATED).json({
      message: 'User registered successfully',
      user,
    });
    return;
  } catch (error) {
    logger.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    if (error instanceof AuthenticationError) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
      return;
    }

    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: 'An error occurred during registration' });
    return;
  }
});

export const authRoutes = router;
