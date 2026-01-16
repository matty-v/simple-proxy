export function getAllowedHosts(): string[] {
  const hostsEnv = process.env.ALLOWED_HOSTS;

  if (!hostsEnv) {
    return [];
  }

  // Support both comma and pipe as delimiters (pipe works better with GCF deploy)
  const delimiter = hostsEnv.includes('|') ? '|' : ',';
  return hostsEnv
    .split(delimiter)
    .map(host => host.trim())
    .filter(host => host.length > 0);
}

export function isHostAllowed(host: string): boolean {
  const allowedHosts = getAllowedHosts();
  return allowedHosts.includes(host);
}
