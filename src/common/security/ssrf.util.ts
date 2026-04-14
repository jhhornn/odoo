import * as net from 'net';
import * as dns from 'dns/promises';

/**
 * Check if an IP address belongs to a private/internal range.
 */
export function isPrivateIp(ip: string): boolean {
  if (
    ip === 'localhost' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '0.0.0.0'
  ) {
    return true;
  }

  if (!net.isIP(ip)) return false;

  // IPv4 private ranges
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local
    if (parts[0] === 127) return true; // loopback
    if (parts[0] === 0) return true; // "this" network
  }

  return false;
}

/**
 * Resolve a hostname and verify all resolved IPs are public.
 * Throws if any resolved IP is private (DNS rebinding protection).
 */
export async function assertPublicHostname(hostname: string): Promise<void> {
  // If it's already an IP literal, just check it
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Blocked delivery to private IP: ${hostname}`);
    }
    return;
  }

  const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
  const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
  const all = [...addresses, ...addresses6];

  if (all.length === 0) {
    throw new Error(`DNS resolution failed for ${hostname}`);
  }

  for (const ip of all) {
    if (isPrivateIp(ip)) {
      throw new Error(
        `Blocked delivery: ${hostname} resolves to private IP ${ip}`,
      );
    }
  }
}
