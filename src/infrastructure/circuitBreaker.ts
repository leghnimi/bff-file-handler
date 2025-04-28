import CircuitBreaker from 'opossum';
import { config } from '../config';
import { logger } from './logging';

export function createCircuitBreaker<T>(
  func: (...args: any[]) => Promise<T>,
  options?: Partial<CircuitBreaker.Options>
): CircuitBreaker {
  const defaultOptions = config.circuitBreakerOptions;
  
  const breaker = new CircuitBreaker(func, {
    ...defaultOptions,
    ...options,
  });

  // Listeners
  breaker.on('open', () => {
    logger.warn(`Circuit breaker opened`);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open`);
  });

  breaker.on('fallback', (result) => {
    logger.warn(`Circuit breaker fallback executed`);
  });

  return breaker;
}