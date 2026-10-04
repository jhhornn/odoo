import * as net from 'net';
import * as dns from 'dns';

/**
 * Address ranges a webhook must never reach: loopback, private, link-local,
 * carrier-grade NAT, benchmarking, multicast, reserved, and their IPv6
 * equivalents (including IPv4-mapped and NAT64 forms).
 */
const BLOCKED = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (cloud metadata endpoints)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64 (embeds IPv4)
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv6');
}

/** Strip the brackets URL.hostname keeps around IPv6 literals */
function normalizeHost(host: string): string {
  return host.replace(/^\[|\]$/g, '').toLowerCase();
}

/** Extract the IPv4 address embedded in an IPv4-mapped IPv6 address */
function embeddedIpv4(ip: string): string | null {
  const match = /^::ffff:(?:0:)?(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (match) return match[1];
  // Hex form, e.g. ::ffff:7f00:1
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/**
 * Check if an address (or `localhost`) belongs to a private, internal or
 * otherwise non-routable range. Non-IP strings other than `localhost` return false.
 */
export function isPrivateIp(address: string): boolean {
  const ip = normalizeHost(address);
  if (ip === 'localhost' || ip.endsWith('.localhost')) return true;

  const family = net.isIP(ip);
  if (family === 4) return BLOCKED.check(ip, 'ipv4');
  if (family === 6) {
    const mapped = embeddedIpv4(ip);
    if (mapped) return BLOCKED.check(mapped, 'ipv4');
    return BLOCKED.check(ip, 'ipv6');
  }
  return false;
}

/**
 * Resolve a hostname and verify all resolved IPs are public.
 * Throws if any resolved IP is private.
 */
export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = normalizeHost(hostname);

  if (net.isIP(host) || host === 'localhost' || host.endsWith('.localhost')) {
    if (isPrivateIp(host)) {
      throw new Error(`Blocked delivery to private address: ${host}`);
    }
    return;
  }

  const results = await dns.promises
    .lookup(host, { all: true, verbatim: true })
    .catch(() => [] as dns.LookupAddress[]);

  if (results.length === 0) {
    throw new Error(`DNS resolution failed for ${host}`);
  }

  for (const { address } of results) {
    if (isPrivateIp(address)) {
      throw new Error(
        `Blocked delivery: ${host} resolves to private IP ${address}`,
      );
    }
  }
}

/**
 * A `lookup` for `http(s).request` that refuses private addresses.
 *
 * Validation happens on the exact address the socket connects to, which
 * closes the DNS-rebinding gap between a pre-flight check and the request.
 */
export const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = addresses as unknown as dns.LookupAddress[];
    const blocked = list.find(({ address }) => isPrivateIp(address));
    if (blocked) {
      const error: NodeJS.ErrnoException = new Error(
        `Blocked delivery: ${hostname} resolves to private IP ${blocked.address}`,
      );
      error.code = 'ESSRFBLOCKED';
      return callback(error, '', 0);
    }
    if ((options as dns.LookupOptions).all) {
      return (callback as any)(null, list);
    }
    const [first] = list;
    return callback(null, first.address, first.family);
  });
};
