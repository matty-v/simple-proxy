import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      expect(limiter.tryRequest()).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      limiter.tryRequest();
    }

    expect(limiter.tryRequest()).toBe(false);
  });

  it('resets after the time window', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      limiter.tryRequest();
    }

    expect(limiter.tryRequest()).toBe(false);

    jest.advanceTimersByTime(60001);

    expect(limiter.tryRequest()).toBe(true);
  });

  it('returns milliseconds until reset', () => {
    const limiter = new RateLimiter(100, 60000);

    for (let i = 0; i < 100; i++) {
      limiter.tryRequest();
    }

    const msUntilReset = limiter.getMsUntilReset();
    expect(msUntilReset).toBeGreaterThan(0);
    expect(msUntilReset).toBeLessThanOrEqual(60000);
  });
});
