export class RateLimiter {
  private count: number = 0;
  private resetTime: number;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {
    this.resetTime = Date.now() + windowMs;
  }

  tryRequest(): boolean {
    const now = Date.now();

    if (now > this.resetTime) {
      this.count = 0;
      this.resetTime = now + this.windowMs;
    }

    if (this.count >= this.limit) {
      return false;
    }

    this.count++;
    return true;
  }

  getMsUntilReset(): number {
    return Math.max(0, this.resetTime - Date.now());
  }
}
