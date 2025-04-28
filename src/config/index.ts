import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  env: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  uploadDir: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  maxConcurrentUploads: number;
  circuitBreakerOptions: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
  cpuThresholdPercent: number;
  memoryThresholdPercent: number;
  highLoadLimitFactor: number;
  cacheDurationMs: number;
  maxFileSizeInBytes: number;
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '10000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1', 10),
  maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '5', 10),
  circuitBreakerOptions: {
    timeout: parseInt(process.env.CIRCUIT_TIMEOUT || '30000', 10),
    errorThresholdPercentage: parseInt(process.env.ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.RESET_TIMEOUT || '30000', 10),
  },
  cpuThresholdPercent: parseInt(process.env.CPU_THRESHOLD_PERCENT || '80', 10),
  memoryThresholdPercent: parseInt(process.env.MEMORY_THRESHOLD_PERCENT || '80', 10),
  highLoadLimitFactor: parseFloat(process.env.HIGH_LOAD_LIMIT_FACTOR || '0.5'),
  cacheDurationMs: parseInt(process.env.CACHE_DURATION_MS || '5000', 10),
  maxFileSizeInBytes: parseInt(process.env.MAX_FILE_SIZE_IN_BYTES || '250000000', 10), 
};