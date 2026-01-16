export interface ParsedTarget {
  host: string;
  targetUrl: string;
}

export function parseTargetUrl(path: string): ParsedTarget | null {
  if (!path || path === '/') {
    return null;
  }

  // Remove leading slash
  const withoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;

  // Split into host and rest
  const slashIndex = withoutLeadingSlash.indexOf('/');
  const host = slashIndex === -1
    ? withoutLeadingSlash
    : withoutLeadingSlash.slice(0, slashIndex);
  const rest = slashIndex === -1
    ? '/'
    : withoutLeadingSlash.slice(slashIndex);

  // Validate host (must contain a dot for domain)
  if (!host || !host.includes('.')) {
    return null;
  }

  return {
    host,
    targetUrl: `https://${host}${rest}`
  };
}
