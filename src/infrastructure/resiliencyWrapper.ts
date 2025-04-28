import { createCircuitBreaker } from './circuitBreaker';
import { logger } from './logging';

export function withCircuitBreaker<T>(
  serviceFunction: (...args: any[]) => Promise<T>,
  fallbackValue?: T,
  options?: any
) {
  const breaker = createCircuitBreaker(serviceFunction, options);
  
  if (fallbackValue !== undefined) {
    breaker.fallback(() => Promise.resolve(fallbackValue));
  }
  
  return async (...args: any[]): Promise<T> => {
    try {
      return await breaker.fire(...args) as T;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Circuit breaker error: ${errorMessage}`);
      throw error;
    }
  };
}