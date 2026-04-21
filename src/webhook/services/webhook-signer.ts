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
 */
export function verifySignature(
  body: string,
  secret: string,
  signatureHeader: string,
  toleranceMs = 300_000,
): boolean {
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

  return crypto.timingSafeEqual(
    Buffer.from(computedSig, 'hex'),
    Buffer.from(expectedSig, 'hex'),
  );
}
