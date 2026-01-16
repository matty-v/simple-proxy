import { isClientAllowed, getAllowedClientIPs } from './client-allowlist';

describe('client-allowlist', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getAllowedClientIPs', () => {
    it('parses comma-separated IPs from env', () => {
      process.env.CLIENT_IP_ALLOWLIST = '192.168.1.1,10.0.0.1';

      expect(getAllowedClientIPs()).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    it('trims whitespace', () => {
      process.env.CLIENT_IP_ALLOWLIST = ' 192.168.1.1 , 10.0.0.1 ';

      expect(getAllowedClientIPs()).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    it('returns empty array when not set', () => {
      delete process.env.CLIENT_IP_ALLOWLIST;

      expect(getAllowedClientIPs()).toEqual([]);
    });
  });

  describe('isClientAllowed', () => {
    it('allows all clients when no allowlist configured', () => {
      delete process.env.CLIENT_IP_ALLOWLIST;

      expect(isClientAllowed('1.2.3.4')).toBe(true);
      expect(isClientAllowed('192.168.1.1')).toBe(true);
    });

    it('allows exact IP match', () => {
      process.env.CLIENT_IP_ALLOWLIST = '192.168.1.1,10.0.0.1';

      expect(isClientAllowed('192.168.1.1')).toBe(true);
      expect(isClientAllowed('10.0.0.1')).toBe(true);
    });

    it('blocks non-matching IPs', () => {
      process.env.CLIENT_IP_ALLOWLIST = '192.168.1.1';

      expect(isClientAllowed('192.168.1.2')).toBe(false);
      expect(isClientAllowed('10.0.0.1')).toBe(false);
    });

    it('supports CIDR notation', () => {
      process.env.CLIENT_IP_ALLOWLIST = '192.168.1.0/24';

      expect(isClientAllowed('192.168.1.1')).toBe(true);
      expect(isClientAllowed('192.168.1.254')).toBe(true);
      expect(isClientAllowed('192.168.2.1')).toBe(false);
    });

    it('supports /32 CIDR (single IP)', () => {
      process.env.CLIENT_IP_ALLOWLIST = '10.0.0.5/32';

      expect(isClientAllowed('10.0.0.5')).toBe(true);
      expect(isClientAllowed('10.0.0.6')).toBe(false);
    });

    it('supports /16 CIDR', () => {
      process.env.CLIENT_IP_ALLOWLIST = '10.20.0.0/16';

      expect(isClientAllowed('10.20.0.1')).toBe(true);
      expect(isClientAllowed('10.20.255.255')).toBe(true);
      expect(isClientAllowed('10.21.0.1')).toBe(false);
    });

    it('supports mixed exact IPs and CIDRs', () => {
      process.env.CLIENT_IP_ALLOWLIST = '1.2.3.4,192.168.0.0/16';

      expect(isClientAllowed('1.2.3.4')).toBe(true);
      expect(isClientAllowed('192.168.1.1')).toBe(true);
      expect(isClientAllowed('192.168.255.255')).toBe(true);
      expect(isClientAllowed('1.2.3.5')).toBe(false);
    });
  });
});
