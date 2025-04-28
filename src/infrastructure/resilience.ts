import { createCircuitBreaker } from './circuitBreaker';
import { retryWithBackoff } from './retryWithBackoff';
import { logger } from './logging';

interface ResilienceOptions {
  circuitBreaker?: any;
  retry?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
    retryableErrors?: Array<string | RegExp>;
  };
  fallbackValue?: any;
}

export function createResilientFunction<T>(
  fn: (...args: any[]) => Promise<T>,
  options: ResilienceOptions = {},
) {
  const breaker = createCircuitBreaker(async (...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options.retry);
  }, options.circuitBreaker);

  if (options.fallbackValue !== undefined) {
    if (typeof options.fallbackValue === 'function') {
      breaker.fallback(async (...args: any[]) => {
        logger.info(`Circuit breaker fallback triggered with ${args.length} arguments`);
        try {
          const result = await Promise.resolve(options.fallbackValue(...args));
          return result;
        } catch (fallbackError) {
          logger.error(`Error in fallback function: ${fallbackError}`);
          return null;
        }
      });
    } else {
      breaker.fallback(() => Promise.resolve(options.fallbackValue));
    }
  }

  return async (...args: any[]): Promise<T> => {
    try {
      return (await breaker.fire(...args)) as T;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Resilience wrapper error: ${errorMessage}`);
      throw error;
    }
  };
}
