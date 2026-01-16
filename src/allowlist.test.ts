import { isHostAllowed, getAllowedHosts } from './allowlist';

describe('allowlist', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getAllowedHosts', () => {
    it('parses comma-separated hosts from env', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com,api.other.com';

      expect(getAllowedHosts()).toEqual(['api.example.com', 'api.other.com']);
    });

    it('trims whitespace', () => {
      process.env.ALLOWED_HOSTS = ' api.example.com , api.other.com ';

      expect(getAllowedHosts()).toEqual(['api.example.com', 'api.other.com']);
    });

    it('returns empty array when not set', () => {
      delete process.env.ALLOWED_HOSTS;

      expect(getAllowedHosts()).toEqual([]);
    });

    it('parses pipe-separated hosts from env', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com|api.other.com';

      expect(getAllowedHosts()).toEqual(['api.example.com', 'api.other.com']);
    });
  });

  describe('isHostAllowed', () => {
    it('returns true for allowed host', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com,api.other.com';

      expect(isHostAllowed('api.example.com')).toBe(true);
    });

    it('returns false for disallowed host', () => {
      process.env.ALLOWED_HOSTS = 'api.example.com';

      expect(isHostAllowed('api.evil.com')).toBe(false);
    });

    it('returns false when no hosts configured', () => {
      delete process.env.ALLOWED_HOSTS;

      expect(isHostAllowed('api.example.com')).toBe(false);
    });
  });
});
