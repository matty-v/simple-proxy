export function getAllowedHosts(): string[] {
  const hostsEnv = process.env.ALLOWED_HOSTS;

  if (!hostsEnv) {
    return [];
  }

  return hostsEnv
    .split(',')
    .map(host => host.trim())
    .filter(host => host.length > 0);
}

export function isHostAllowed(host: string): boolean {
  const allowedHosts = getAllowedHosts();
  return allowedHosts.includes(host);
}
