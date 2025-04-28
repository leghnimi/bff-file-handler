import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { authService } from '../../domain/services/auth.service';
import { logger } from '../../infrastructure/logging';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Authorization header required' });
      return;
    }
    
    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid authorization format' });
      return;
    }
    
    const decoded = await authService.verifyToken(token);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Authentication failed' });
  }
};