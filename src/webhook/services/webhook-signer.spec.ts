import { signPayload, verifySignature } from './webhook-signer';

describe('webhook signer', () => {
  const body = JSON.stringify({ hello: 'world' });
  const secret = 'whsec_test';

  it('verifies a signature it produced', () => {
    const header = signPayload(body, secret, Date.now());
    expect(verifySignature(body, secret, header)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const header = signPayload(body, secret, Date.now());
    expect(verifySignature(body + ' ', secret, header)).toBe(false);
  });

  it('rejects stale timestamps', () => {
    const header = signPayload(body, secret, Date.now() - 10 * 60_000);
    expect(verifySignature(body, secret, header)).toBe(false);
  });

  it('returns false instead of throwing on malformed signatures', () => {
    const t = Date.now();
    expect(verifySignature(body, secret, `t=${t},v1=abcd`)).toBe(false);
    expect(verifySignature(body, secret, `t=${t},v1=zz`)).toBe(false);
    expect(verifySignature(body, secret, 'garbage')).toBe(false);
    expect(verifySignature(body, secret, undefined)).toBe(false);
  });
});
