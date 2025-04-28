import { AuthServiceImpl, AuthenticationError } from '../domain/services/auth.service';
import jwt from 'jsonwebtoken';
import { config } from '../config';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-token'),
  verify: jest.fn().mockImplementation((token) => {
    if (token === 'valid-token') {
      return { id: 'user-id', username: 'test-user', email: 'test@example.com' };
    }
    throw new Error('invalid token');
  }),
}));

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn().mockImplementation((hash, password) => {
    return Promise.resolve(password === 'correct-password');
  }),
}));

describe('AuthService', () => {
  let authService: AuthServiceImpl;

  beforeEach(() => {
    authService = new AuthServiceImpl();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const user = await authService.register('testuser', 'test@example.com', 'password123');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.id).toBeDefined();
      expect((user as any).password).toBeUndefined();
    });

    it('should throw error if user already exists', async () => {
      await authService.register('existinguser', 'existing@example.com', 'password123');
      
      await expect(authService.register('existinguser', 'new@example.com', 'password123'))
        .rejects
        .toThrow(AuthenticationError);
      
      await expect(authService.register('newuser', 'existing@example.com', 'password123'))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      await authService.register('loginuser', 'login@example.com', 'correct-password');
      
      const token = await authService.login({ username: 'loginuser', password: 'correct-password' });
      
      expect(token).toBe('mocked-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'loginuser' }), 
        config.jwtSecret, 
        expect.objectContaining({ expiresIn: config.jwtExpiresIn })
      );
    });

    it('should throw error with incorrect username', async () => {
      await expect(authService.login({ username: 'nonexistent', password: 'anypassword' }))
        .rejects
        .toThrow(AuthenticationError);
    });

    it('should throw error with incorrect password', async () => {
      await authService.register('passworduser', 'password@example.com', 'correct-password');
      
      await expect(authService.login({ username: 'passworduser', password: 'wrong-password' }))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const result = await authService.verifyToken('valid-token');
      expect(result).toEqual({ id: 'user-id', username: 'test-user', email: 'test@example.com' });
    });

    it('should throw error for an invalid token', async () => {
      await expect(authService.verifyToken('invalid-token'))
        .rejects
        .toThrow(AuthenticationError);
    });
  });
});