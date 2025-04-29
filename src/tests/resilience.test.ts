import { createResilientFunction } from '../infrastructure/resilience';
import { createCircuitBreaker } from '../infrastructure/circuitBreaker';
import { retryWithBackoff } from '../infrastructure/retryWithBackoff';
import { logger } from '../infrastructure/logging';

jest.mock('../infrastructure/circuitBreaker', () => ({
  createCircuitBreaker: jest.fn().mockImplementation((fn, options) => {
    const mockBreaker = {
      fire: jest.fn().mockImplementation((...args) => fn(...args)),
      fallback: jest.fn().mockImplementation(fn => {
        mockBreaker._fallbackFn = fn;
        return mockBreaker;
      }),
      _fallbackFn: null,
      status: { state: 'closed' },
      open: () => {
        mockBreaker.status.state = 'open';
      }
    };
    return mockBreaker;
  })
}));

jest.mock('../infrastructure/retryWithBackoff', () => ({
  retryWithBackoff: jest.fn().mockImplementation((fn, options) => fn())
}));

jest.mock('../infrastructure/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Resilient Function', () => {
  let mockFunction: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFunction = jest.fn().mockResolvedValue('success result');
  });
  
  it('should create a resilient function with circuit breaker and retry', async () => {
    const resilientFn = createResilientFunction(mockFunction, {
      circuitBreaker: { timeout: 1000 },
      retry: { maxRetries: 3 }
    });
    
    const result = await resilientFn('arg1', 'arg2');
    
    expect(createCircuitBreaker).toHaveBeenCalled();
    
    expect(retryWithBackoff).toHaveBeenCalled();
    
    expect(result).toBe('success result');
  });
  
  it('should handle errors and pass them through', async () => {
    const error = new Error('Test error');
    mockFunction.mockRejectedValue(error);
    
    (retryWithBackoff as jest.Mock).mockImplementationOnce(() => Promise.reject(error));
    
    const resilientFn = createResilientFunction(mockFunction);
    
    await expect(resilientFn('arg')).rejects.toThrow('Test error');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
  });
  
  it('should use a simple fallback value when provided', async () => {
    const error = new Error('Test error');
    mockFunction.mockRejectedValue(error);
    
    (retryWithBackoff as jest.Mock).mockImplementationOnce(() => Promise.reject(error));
    
    const fallbackValue = 'fallback result';
    const resilientFn = createResilientFunction(mockFunction, {
      fallbackValue
    });
    
    const circuitBreaker = (createCircuitBreaker as jest.Mock).mock.results[0].value;
    const fallbackFn = circuitBreaker.fallback.mock.calls[0][0];
    
    circuitBreaker.fire.mockRejectedValueOnce(error);
    const fallbackResult = await fallbackFn();
    
    expect(fallbackResult).toBe(fallbackValue);
  });
  
  it('should use a function fallback when provided', async () => {
    const error = new Error('Test error');
    mockFunction.mockRejectedValue(error);
    
    (retryWithBackoff as jest.Mock).mockImplementationOnce(() => Promise.reject(error));
    
    const fallbackFn = jest.fn().mockReturnValue('dynamic fallback');
    const resilientFn = createResilientFunction(mockFunction, {
      fallbackValue: fallbackFn
    });
    
    const circuitBreaker = (createCircuitBreaker as jest.Mock).mock.results[0].value;
    const registeredFallback = circuitBreaker.fallback.mock.calls[0][0];
    
    circuitBreaker.fire.mockRejectedValueOnce(error);
    const fallbackResult = await registeredFallback('arg1', 'arg2');
    
    expect(fallbackFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(fallbackResult).toBe('dynamic fallback');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Circuit breaker fallback triggered'));
  });
  
  it('should handle errors in fallback function', async () => {
    const error = new Error('Test error');
    mockFunction.mockRejectedValue(error);
    
    (retryWithBackoff as jest.Mock).mockImplementationOnce(() => Promise.reject(error));
    
    const fallbackError = new Error('Fallback error');
    const fallbackFn = jest.fn().mockRejectedValue(fallbackError);
    const resilientFn = createResilientFunction(mockFunction, {
      fallbackValue: fallbackFn
    });
    
    const circuitBreaker = (createCircuitBreaker as jest.Mock).mock.results[0].value;
    const registeredFallback = circuitBreaker.fallback.mock.calls[0][0];
    
    circuitBreaker.fire.mockRejectedValueOnce(error);
    const fallbackResult = await registeredFallback();
    
    expect(fallbackFn).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in fallback function'));
    expect(fallbackResult).toBeNull();
  });
});