import os from 'os';
import pidusage from 'pidusage';
import { config } from '../../config';
import { logger } from '../../infrastructure/logging';

interface CachedLimit {
  limit: number;
  timestamp: number;
}

export class DynamicRateLimiterService {
  private cachedLimit: CachedLimit | null = null;
  private isCheckingMetrics = false;

  public async getCurrentLimit(): Promise<number> {
    const now = Date.now();

    if (this.cachedLimit && now - this.cachedLimit.timestamp < config.cacheDurationMs) {
      return this.cachedLimit.limit;
    }

    if (this.isCheckingMetrics) {
      logger.debug('Metric check already in progress, returning cached/default limit.');
      return this.cachedLimit ? this.cachedLimit.limit : config.rateLimitMax;
    }

    this.isCheckingMetrics = true;

    try {
      const stats = await pidusage(process.pid);
      const freeMemory = os.freemem();
      const totalMemory = os.totalmem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      const cpuUsagePercent = stats.cpu;

      logger.debug(
        `System Metrics - CPU: ${cpuUsagePercent.toFixed(1)}%, Memory: ${memoryUsagePercent.toFixed(
          1,
        )}%`,
      );

      let currentLimit = config.rateLimitMax;

      if (
        cpuUsagePercent > config.cpuThresholdPercent ||
        memoryUsagePercent > config.memoryThresholdPercent
      ) {
        const reducedLimit = Math.max(
          1,
          Math.floor(config.rateLimitMax * config.highLoadLimitFactor),
        );
        logger.warn(
          `High system load detected (CPU: ${cpuUsagePercent.toFixed(
            1,
          )}%, Memory: ${memoryUsagePercent.toFixed(1)}%). Reducing rate limit from ${
            config.rateLimitMax
          } to ${reducedLimit}.`,
        );
        currentLimit = reducedLimit;
      }

      this.cachedLimit = { limit: currentLimit, timestamp: now };
      return currentLimit;
    } catch (error: any) {
      logger.error(
        'Error fetching system metrics for dynamic rate limiting:',
        error.message || error,
      );
      return config.rateLimitMax;
    } finally {
      this.isCheckingMetrics = false;
    }
  }
}

export const dynamicRateLimiterService = new DynamicRateLimiterService();
