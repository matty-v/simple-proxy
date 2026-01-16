export function getAllowedClientIPs(): string[] {
  const ipsEnv = process.env.CLIENT_IP_ALLOWLIST;

  if (!ipsEnv) {
    return [];
  }

  return ipsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

export function isClientAllowed(clientIp: string): boolean {
  const allowedIPs = getAllowedClientIPs();

  // If no allowlist configured, allow all clients
  if (allowedIPs.length === 0) {
    return true;
  }

  // Check for exact match or CIDR match
  return allowedIPs.some(allowed => {
    if (allowed.includes('/')) {
      return isIpInCidr(clientIp, allowed);
    }
    return clientIp === allowed;
  });
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  if (ipNum === null || rangeNum === null) {
    return false;
  }

  const maskBits = ~((1 << (32 - mask)) - 1) >>> 0;
  return (ipNum & maskBits) === (rangeNum & maskBits);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }

  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) {
      return null;
    }
    num = (num << 8) + n;
  }
  return num >>> 0;
}
