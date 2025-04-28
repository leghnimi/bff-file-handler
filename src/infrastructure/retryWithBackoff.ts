import { logger } from './logging';

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: Array<string | RegExp>;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffFactor: 2,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions = { ...defaultRetryOptions, ...options };
  let lastError = new Error('Operation failed');
  let delay = retryOptions.initialDelayMs;

  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt} of ${retryOptions.maxRetries}`);
      }
      return await fn();
    } catch (error: any) {
      lastError = error as Error;
      
      if (retryOptions.retryableErrors && !isRetryableError(error, retryOptions.retryableErrors)) {
        logger.warn(`Non-retryable error: ${error.message}`);
        throw error;
      }
      
      if (attempt >= retryOptions.maxRetries) {
        logger.error(`Max retries (${retryOptions.maxRetries}) reached. Giving up.`);
        throw error;
      }

      logger.warn(`Operation failed, retrying in ${delay}ms: ${error.message}`);
      await sleep(delay);
      
      delay = Math.min(delay * retryOptions.backoffFactor, retryOptions.maxDelayMs);
    }
  }
  
  throw lastError;
}

function isRetryableError(error: any, retryableErrors: Array<string | RegExp>): boolean {
  const errorMessage = error.message || '';
  return retryableErrors.some(pattern => {
    if (typeof pattern === 'string') {
      return errorMessage.includes(pattern);
    }
    return pattern.test(errorMessage);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}