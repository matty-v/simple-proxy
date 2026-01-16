import { parseTargetUrl } from './url-parser';

describe('parseTargetUrl', () => {
  it('parses host and path from request path', () => {
    const result = parseTargetUrl('/api.example.com/users/123');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/users/123'
    });
  });

  it('handles root path', () => {
    const result = parseTargetUrl('/api.example.com');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/'
    });
  });

  it('handles root path with trailing slash', () => {
    const result = parseTargetUrl('/api.example.com/');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/'
    });
  });

  it('preserves query string', () => {
    const result = parseTargetUrl('/api.example.com/search?q=test&page=1');

    expect(result).toEqual({
      host: 'api.example.com',
      targetUrl: 'https://api.example.com/search?q=test&page=1'
    });
  });

  it('returns null for empty path', () => {
    expect(parseTargetUrl('')).toBeNull();
    expect(parseTargetUrl('/')).toBeNull();
  });

  it('returns null for invalid host', () => {
    expect(parseTargetUrl('/not-a-valid-host')).toBeNull();
  });
});
