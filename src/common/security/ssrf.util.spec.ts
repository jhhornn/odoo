import { assertPublicHostname, isPrivateIp, safeLookup } from './ssrf.util';

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '[::1]',
    '::',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '64:ff9b::a00:1',
    'localhost',
    'api.localhost',
  ])('blocks %s', (address) => {
    expect(isPrivateIp(address)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.32.0.1',
    '2606:4700:4700::1111',
    'example.com',
  ])('allows %s', (address) => {
    expect(isPrivateIp(address)).toBe(false);
  });
});

describe('assertPublicHostname', () => {
  it('rejects private IP literals, including bracketed IPv6', async () => {
    await expect(assertPublicHostname('[::1]')).rejects.toThrow(/private/);
    await expect(assertPublicHostname('10.0.0.5')).rejects.toThrow(/private/);
  });

  it('rejects localhost names', async () => {
    await expect(assertPublicHostname('localhost')).rejects.toThrow(/private/);
  });
});

describe('safeLookup', () => {
  it('refuses to connect to hosts resolving to loopback', (done) => {
    safeLookup('localhost', {}, (err) => {
      expect(err).toBeTruthy();
      expect((err as NodeJS.ErrnoException).code).toBe('ESSRFBLOCKED');
      done();
    });
  });
});
