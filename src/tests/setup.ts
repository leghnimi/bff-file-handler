import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

jest.mock('p-limit', () => {
  return jest.fn().mockImplementation((concurrency) => {
    return jest.fn().mockImplementation((fn) => {
      return jest.fn().mockImplementation((...args) => fn(...args));
    });
  });
});

beforeAll(() => {
});

afterAll(() => {
});