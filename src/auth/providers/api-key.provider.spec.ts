import { ApiKeyProvider, apiKeyLookupId } from './api-key.provider';

function createProvider(records: any[], cached: string | null = null) {
  const exec = jest.fn().mockResolvedValue([]);
  const multi = { set: jest.fn().mockReturnThis(), exec };
  const redis = {
    get: jest.fn().mockResolvedValue(cached),
    del: jest.fn().mockResolvedValue(1),
    multi: jest.fn(() => multi),
  };
  const db = {
    apiKey: {
      findMany: jest.fn().mockResolvedValue(records),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const provider = new ApiKeyProvider(db as any, redis as any);
  jest.spyOn(provider, 'hashKey');
  return { provider, db, redis };
}

const KEY = 'octo_odoo_AbCdEfGh' + 'x'.repeat(35);

describe('ApiKeyProvider', () => {
  it('derives the lookup id from the random part of the key', () => {
    expect(apiKeyLookupId(KEY)).toBe('AbCdEfGh');
  });

  it('rejects unknown keys without running scrypt', async () => {
    const { provider } = createProvider([]);
    await expect(provider.validate(KEY)).resolves.toBeNull();
    expect(provider.hashKey).not.toHaveBeenCalled();
  });

  it('rejects keys without the expected marker before any lookup', async () => {
    const { provider, db } = createProvider([]);
    await expect(provider.validate('nope')).resolves.toBeNull();
    expect(db.apiKey.findMany).not.toHaveBeenCalled();
  });

  it('serves cache hits without running scrypt', async () => {
    const ctx = {
      keyId: '1',
      systemName: 's',
      scopes: [],
      rateLimitTier: 'default',
    };
    const { provider } = createProvider([], JSON.stringify(ctx));
    await expect(provider.validate(KEY)).resolves.toEqual(ctx);
    expect(provider.hashKey).not.toHaveBeenCalled();
  });

  it('validates a stored key and upgrades a legacy lookup id', async () => {
    const probe = new ApiKeyProvider({} as any, {} as any);
    const keyHash = await probe.hashKey(KEY);
    const record = {
      id: 'key-1',
      prefix: 'octo_odo',
      keyHash,
      systemName: 'billing',
      scopes: ['read'],
      rateLimitTier: 'default',
      revokedAt: null,
      expiresAt: null,
    };
    const { provider, db } = createProvider([record]);

    await expect(provider.validate(KEY)).resolves.toMatchObject({
      keyId: 'key-1',
      scopes: ['read'],
    });
    expect(db.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prefix: 'AbCdEfGh' }),
      }),
    );
  });
});
