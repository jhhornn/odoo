import { Global, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import * as request from 'supertest';
import { OdooModule } from './odoo.module';
import { OdooApiModule } from './odoo-api.module';
import { XmlRpcClientFactory } from './factories/xml-rpc-client.factory';
import { PartnerModule } from '../partner/partner.module';
import { DatabaseService } from '../common/database/database.service';
import { API_KEY_PROVIDER } from '../common/constants';
import { ApiKeyProvider } from '../auth/providers/api-key.provider';
import { ApiKeyService } from '../auth/services/api-key.service';

const VALID_KEY = 'octo_odoo_valid';

/** Stand-ins for PostgreSQL and Redis */
@Global()
@Module({
  providers: [
    { provide: DatabaseService, useValue: {} },
    {
      provide: getRedisConnectionToken(),
      useValue: {
        pipeline: () => ({
          zremrangebyscore() {},
          zadd() {},
          zcard() {},
          pexpire() {},
          exec: async () => [null, null, [null, 1], null],
        }),
      },
    },
  ],
  exports: [DatabaseService, getRedisConnectionToken()],
})
class FakeInfraModule {}

describe('Packaged HTTP routes (library usage, no global guard)', () => {
  let app: INestApplication;
  const methodCall = jest.fn(async (method: string, params: any[]) => {
    if (method === 'authenticate') return 7;
    if (params[4] === 'read') return [{ id: params[5][0][0], name: 'Acme' }];
    return [];
  });

  beforeAll(async () => {
    const fakeKeyProvider = {
      validate: async (key: string) =>
        key === VALID_KEY
          ? {
              keyId: 'k',
              systemName: 'test',
              scopes: [],
              rateLimitTier: 'default',
            }
          : null,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        FakeInfraModule,
        OdooModule.forRoot({
          url: 'https://odoo.example.com',
          database: 'db',
          username: 'bot',
          password: 'secret',
          cache: false,
        }),
        OdooApiModule.register({ allowedModels: ['res.partner'] }),
        PartnerModule,
      ],
    })
      .overrideProvider(XmlRpcClientFactory)
      .useValue({ createClient: () => ({ methodCall }) })
      .overrideProvider(API_KEY_PROVIDER)
      .useValue(fakeKeyProvider)
      .overrideProvider(ApiKeyProvider)
      .useValue(fakeKeyProvider)
      .overrideProvider(ApiKeyService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects generic routes without an API key', async () => {
    await request(app.getHttpServer()).get('/odoo/res.partner/1').expect(401);
  });

  it('rejects domain routes without an API key', async () => {
    await request(app.getHttpServer()).get('/partners/customers').expect(401);
  });

  it('serves allowed models with a valid key', async () => {
    const res = await request(app.getHttpServer())
      .get('/odoo/res.partner/1')
      .set('X-API-Key', VALID_KEY)
      .expect(200);
    expect(res.body).toEqual({ id: 1, name: 'Acme' });
  });

  it('blocks models outside the allowlist', async () => {
    await request(app.getHttpServer())
      .get('/odoo/res.users/1')
      .set('X-API-Key', VALID_KEY)
      .expect(403);
  });

  it('rejects malformed model names', async () => {
    await request(app.getHttpServer())
      .get('/odoo/Res;Partner/1')
      .set('X-API-Key', VALID_KEY)
      .expect(400);
  });

  it('routes /odoo/models/* to the metadata controller', async () => {
    await request(app.getHttpServer())
      .get('/odoo/models/common-models')
      .set('X-API-Key', VALID_KEY)
      .expect(200);
  });
});
