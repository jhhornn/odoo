import * as crypto from 'crypto';

/**
 * Compute HMAC-SHA256 webhook signature per spec:
 * sign(`${timestamp}.${body}`) → `t=<timestamp>,v1=<hex>`
 */
export function signPayload(
  body: string,
  secret: string,
  timestamp: number,
): string {
  const message = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify a webhook signature header.
 * Rejects if timestamp is older than `toleranceMs` (default 5 minutes).
 * Never throws: malformed or missing headers return `false`.
 *
 * Pass the raw request body exactly as received, not re-serialized JSON.
 */
export function verifySignature(
  body: string,
  secret: string,
  signatureHeader: string | undefined,
  toleranceMs = 300_000,
): boolean {
  if (typeof signatureHeader !== 'string') return false;
  const parts = signatureHeader.split(',');
  const tPart = parts.find((p) => p.startsWith('t='));
  const vPart = parts.find((p) => p.startsWith('v1='));

  if (!tPart || !vPart) return false;

  const timestamp = parseInt(tPart.slice(2), 10);
  const expectedSig = vPart.slice(3);

  if (isNaN(timestamp)) return false;

  // Reject if timestamp is too old
  if (Math.abs(Date.now() - timestamp) > toleranceMs) return false;

  const message = `${timestamp}.${body}`;
  const computedSig = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  const expected = Buffer.from(computedSig, 'hex');
  const received = Buffer.from(expectedSig, 'hex');
  // timingSafeEqual throws on length mismatch; a malformed header is just invalid
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(expected, received)
  );
}
