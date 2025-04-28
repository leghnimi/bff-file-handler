import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  env: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  uploadDir: string;
  maxFileSize: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  maxConcurrentUploads: number;
  circuitBreakerOptions: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '262144000', 10), // 250MB
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '10000', 10), // 10s
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1', 10), // 1 req
  maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '5', 10),
  circuitBreakerOptions: {
    timeout: parseInt(process.env.CIRCUIT_TIMEOUT || '30000', 10),
    errorThresholdPercentage: parseInt(process.env.ERROR_THRESHOLD || '50', 10), // 50%
    resetTimeout: parseInt(process.env.RESET_TIMEOUT || '30000', 10),
  }
};