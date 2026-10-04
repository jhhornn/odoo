import { HttpStatus } from '@nestjs/common';
import { OdooService } from './odoo.service';
import { OdooConfigService } from './infrastructure/config/odoo.config';
import {
  OdooTimeoutError,
  XmlRpcClientFactory,
} from './factories/xml-rpc-client.factory';
import {
  OdooErrorCode,
  OdooException,
} from './infrastructure/exceptions/odoo.exception';

function createService(
  methodCall: jest.Mock,
  redis?: Record<string, jest.Mock>,
) {
  const config = new OdooConfigService(undefined, {
    url: 'https://odoo.example.com',
    database: 'db',
    username: 'bot@example.com',
    password: 'secret',
  });
  const factory = {
    createClient: () => ({ methodCall }),
  } as unknown as XmlRpcClientFactory;
  return new OdooService(config, factory, redis as any);
}

describe('OdooService', () => {
  it('shares one login between concurrent calls', async () => {
    const methodCall = jest.fn(async (method: string) =>
      method === 'authenticate' ? 7 : [],
    );
    const service = createService(methodCall);

    await Promise.all([
      service.search('res.partner'),
      service.search('res.partner'),
      service.search('res.partner'),
    ]);

    const logins = methodCall.mock.calls.filter(([m]) => m === 'authenticate');
    expect(logins).toHaveLength(1);
  });

  it('reports rejected credentials as INVALID_CREDENTIALS', async () => {
    const service = createService(jest.fn(async () => false));
    await expect(service.search('res.partner')).rejects.toMatchObject({
      code: OdooErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('never exposes Odoo tracebacks to callers', async () => {
    const fault = new Error(
      'Traceback (most recent call last):\n  File "/opt/odoo/x.py"\nodoo.exceptions.UserError: Nope',
    );
    const methodCall = jest.fn(async (method: string) => {
      if (method === 'authenticate') return 7;
      throw fault;
    });
    const service = createService(methodCall);

    const error = (await service
      .create('res.partner', {})
      .catch((e) => e)) as OdooException;
    expect(error).toBeInstanceOf(OdooException);
    expect(error.code).toBe(OdooErrorCode.API_ERROR);
    expect(JSON.stringify(error.getResponse())).not.toContain('/opt/odoo');
    expect(error.message).toContain('UserError: Nope');
  });

  it('maps timeouts to CONNECTION_ERROR / 504', async () => {
    const methodCall = jest.fn(async (method: string) => {
      if (method === 'authenticate') return 7;
      throw new OdooTimeoutError(100);
    });
    const error = await createService(methodCall)
      .search('res.partner')
      .catch((e) => e);
    expect(error.code).toBe(OdooErrorCode.CONNECTION_ERROR);
    expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
  });

  it('re-authenticates after AccessDenied', async () => {
    let fail = true;
    const methodCall = jest.fn(async (method: string) => {
      if (method === 'authenticate') return 7;
      if (fail) {
        fail = false;
        throw new Error('odoo.exceptions.AccessDenied: Access Denied');
      }
      return [];
    });
    const service = createService(methodCall);

    await expect(service.search('res.partner')).rejects.toBeInstanceOf(
      OdooException,
    );
    await service.search('res.partner');
    const logins = methodCall.mock.calls.filter(([m]) => m === 'authenticate');
    expect(logins).toHaveLength(2);
  });

  it('serves cachedSearchRead without Redis', async () => {
    const methodCall = jest.fn(async (method: string) =>
      method === 'authenticate' ? 7 : [{ id: 1 }],
    );
    const service = createService(methodCall);
    await expect(service.cachedSearchRead('res.partner')).resolves.toEqual([
      { id: 1 },
    ]);
    await expect(service.invalidateModelCache('res.partner')).resolves.toBe(
      undefined,
    );
  });

  it('falls back to Odoo when Redis errors', async () => {
    const methodCall = jest.fn(async (method: string) =>
      method === 'authenticate' ? 7 : [{ id: 1 }],
    );
    const redis = {
      get: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      set: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const service = createService(methodCall, redis);
    await expect(service.cachedSearchRead('res.partner')).resolves.toEqual([
      { id: 1 },
    ]);
  });
});

describe('OdooConfigService', () => {
  it('prefers explicit options over environment variables', () => {
    process.env.ODOO_DATABASE = 'from-env';
    const config = new OdooConfigService(undefined, {
      database: 'explicit',
      username: 'u',
      password: 'p',
    });
    expect(config.database).toBe('explicit');
    delete process.env.ODOO_DATABASE;
  });

  it('rejects non-http URLs', () => {
    expect(
      () =>
        new OdooConfigService(undefined, {
          url: 'file:///etc/passwd',
          database: 'd',
          username: 'u',
          password: 'p',
        }),
    ).toThrow(/http/);
  });
});
