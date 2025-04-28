import { Request, Response } from 'express';
import { authenticate } from '../api/middlewares/auth.middleware';
import { authService } from '../domain/services/auth.service';
import { StatusCodes } from 'http-status-codes';

jest.mock('../domain/services/auth.service', () => ({
  authService: {
    verifyToken: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    nextFunction = jest.fn();
  });

  it('should call next() when a valid token is provided', async () => {
    (authService.verifyToken as jest.Mock).mockResolvedValue({
      id: 'user1',
      username: 'testuser',
      email: 'test@example.com',
    });
    
    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };

    await authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockRequest.user).toEqual({
      id: 'user1',
      username: 'testuser',
      email: 'test@example.com',
    });
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no authorization header is provided', async () => {
    mockRequest.headers = {};

    await authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Authorization header required' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization format is invalid', async () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat',
    };

    await authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid authorization format' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when token verification fails', async () => {
    (authService.verifyToken as jest.Mock).mockRejectedValue(
      new Error('Invalid token')
    );
    
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    await authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(authService.verifyToken).toHaveBeenCalledWith('invalid-token');
    expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Authentication failed' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });
});