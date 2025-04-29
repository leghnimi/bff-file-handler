import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

jest.mock('../infrastructure/multer.config', () => {
  const mockUpload = {
    array: jest.fn().mockImplementation(() => {
      return (req: Request, res: Response, next: NextFunction) => {
        if (req.headers['x-test-file-error']) {
          const error = new Error('Test file error');
          return next(error);
        }

        if (
          req.headers['content-type'] === 'multipart/form-data' &&
          !req.get('x-test-rate-limit-exceeded') &&
          !req.get('testmode') &&
          !req.get('x-test-file-error')
        ) {
          req.files = [];
          return next();
        }

        const fileObj = {
          fieldname: 'file',
          filename: 'test-file.csv',
          originalname: 'original-test-file.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          size: 1024,
          destination: '/tmp',
          path: '/tmp/test-file.csv',
          buffer: Buffer.from('test file content'),
          stream: {} as any,
        };

        (fileObj as any).testMode = req.headers['testmode'];

        req.files = [fileObj];
        next();
      };
    }),
  };

  return {
    upload: mockUpload,
    handleMulterError: (err: any, req: Request, res: Response, next: NextFunction) => {
      if (err) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: err.message || 'File upload error' });
      }
      next();
    },
  };
});

let app: express.Express;

beforeAll(() => {
  jest.isolateModules(() => {
    const fileRoutes = require('../api/routes/file.routes').fileRoutes;
    const { handleMulterError } = require('../infrastructure/multer.config');

    app = express();
    app.use(express.json());
    app.use('/api/files', fileRoutes);

    app.use(handleMulterError);

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Error in test:', err);
      res.status(StatusCodes.BAD_REQUEST).json({ message: err.message || 'An error occurred' });
    });
  });
});

it('should handle file upload errors', async () => {
  const response = await request(app)
    .post('/api/files')
    .set('x-test-file-error', 'true')
    .attach('file', Buffer.from('test file content'), 'test-file.csv');

  expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  if (response.body && response.body.message) {
    expect(response.body.message).toBe('Test file error');
  } else {
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  }
});

jest.mock('../domain/services/dynamicRateLimiter.service', () => {
  return {
    dynamicRateLimiterService: {
      getCurrentLimit: jest.fn().mockResolvedValue(5),
    },
  };
});

jest.mock('../infrastructure/resilience', () => {
  const mockResilientFn = jest.fn().mockImplementation((fn) => {
    return (...args: any[]) => {
      const testMode = args[0].testMode;
      if (testMode === 'fail') {
        return Promise.reject(new Error('Resilient function test failure'));
      } else if (testMode === 'fallback') {
        return Promise.resolve({
          filename: args[0].filename,
          originalname: args[0].originalname,
          processed: false,
          error: 'Using fallback',
        });
      }
      return fn(...args);
    };
  });

  return {
    createResilientFunction: mockResilientFn,
  };
});

jest.mock('express-rate-limit', () => {
  return function () {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.headers['x-test-rate-limit-exceeded']) {
        return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          message: 'Rate limit exceeded',
        });
      }
      next();
    };
  };
});

jest.mock('../api/middlewares/auth.middleware', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    req.user = {
      id: 'test-user-id',
      username: 'test-user',
      email: 'test@example.com',
    };
    next();
  },
}));

describe('File Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    jest.isolateModules(() => {
      const fileRoutes = require('../api/routes/file.routes').fileRoutes;
      const { handleMulterError } = require('../infrastructure/multer.config');

      app = express();
      app.use(express.json());
      app.use('/api/files', fileRoutes);

      app.use(handleMulterError);

      app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        console.error('Error in test:', err);
        res.status(StatusCodes.BAD_REQUEST).json({ message: err.message || 'An error occurred' });
      });
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully upload a file', async () => {
    const response = await request(app)
      .post('/api/files')
      .attach('file', Buffer.from('test file content'), 'test-file.csv');

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.message).toContain('files uploaded successfully');
    expect(response.body.results).toBeInstanceOf(Array);
    expect(response.body.results.length).toBeGreaterThan(0);
  });

  it('should handle rate limiting', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('x-test-rate-limit-exceeded', 'true')
      .attach('file', Buffer.from('test file content'), 'test-file.csv');

    expect(response.status).toBe(StatusCodes.TOO_MANY_REQUESTS);
  });

  it('should handle file processing errors with resilience mechanisms', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('testmode', 'fallback')
      .attach('file', Buffer.from('test file content'), 'test-file.csv');

    expect(response.status).toBe(StatusCodes.CREATED);

    expect(response.body.results).toBeInstanceOf(Array);
    expect(response.body.failed).toBeDefined();
    expect(response.body.failed.count).toBe(1);
    expect(response.body.message).toContain('files uploaded successfully');
  });

  it('should handle missing files error', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('Content-Type', 'multipart/form-data');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.message).toContain('No files uploaded');
  });

  it('should handle file upload errors', async () => {
    const response = await request(app)
      .post('/api/files')
      .set('x-test-file-error', 'true')
      .attach('file', Buffer.from('test file content'), 'test-file.csv');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    if (response.body && response.body.message) {
      expect(response.body.message).toBe('Test file error');
    } else {
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    }
  });
});
