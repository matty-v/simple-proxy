import { getAllowedOrigins, isOriginAllowed } from './index';

describe('CORS origins', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getAllowedOrigins', () => {
    it('parses comma-separated origins from env', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://localhost:3000';

      expect(getAllowedOrigins()).toEqual(['https://app.example.com', 'https://localhost:3000']);
    });

    it('parses pipe-separated origins from env', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com|https://localhost:3000';

      expect(getAllowedOrigins()).toEqual(['https://app.example.com', 'https://localhost:3000']);
    });

    it('trims whitespace', () => {
      process.env.CORS_ALLOWED_ORIGINS = ' https://app.example.com , https://localhost:3000 ';

      expect(getAllowedOrigins()).toEqual(['https://app.example.com', 'https://localhost:3000']);
    });

    it('returns empty array when not set', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;

      expect(getAllowedOrigins()).toEqual([]);
    });
  });

  describe('isOriginAllowed', () => {
    it('returns true for allowed origin', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://localhost:3000';

      expect(isOriginAllowed('https://app.example.com')).toBe(true);
    });

    it('returns false for disallowed origin', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';

      expect(isOriginAllowed('https://evil.com')).toBe(false);
    });

    it('returns false when origin is undefined', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';

      expect(isOriginAllowed(undefined)).toBe(false);
    });

    it('returns true for any origin when no origins configured (allow all)', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;

      expect(isOriginAllowed('https://any.com')).toBe(true);
    });
  });
});
