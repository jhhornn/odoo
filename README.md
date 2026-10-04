# @jhhornn/nestjs-odoo

[![npm](https://img.shields.io/npm/v/@jhhornn/nestjs-odoo.svg)](https://www.npmjs.com/package/@jhhornn/nestjs-odoo)
[![license](https://img.shields.io/npm/l/@jhhornn/nestjs-odoo.svg)](LICENSE)

NestJS modules and services for integrating with Odoo over XML-RPC.

- **Typed Odoo client:** `search`, `read`, `searchRead`, `create`, `write`, `unlink`, and more, with timeouts and an optional Redis cache.
- **Domain services:** partners, products, invoices, payments and taxes, usable with or without HTTP routes.
- **Optional REST API:** packaged controllers protected by API keys, per-key rate limiting and scopes.
- **Webhooks:** signed (HMAC-SHA256), retried with backoff, and SSRF-hardened.

> Upgrading from 0.1.x? Read [Upgrading to 0.2](#upgrading-from-01x-to-02). Packaged routes are now
> protected by default, and the generic `/odoo/*` routes are opt-in.

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Choose a setup](#choose-a-setup)
- [1. Odoo client only](#1-odoo-client-only)
- [2. Domain services without HTTP routes](#2-domain-services-without-http-routes)
- [3. Full integration with REST API and webhooks](#3-full-integration-with-rest-api-and-webhooks)
- [Security model](#security-model)
- [Receiving webhooks](#receiving-webhooks)
- [Configuration reference](#configuration-reference)
- [Error handling](#error-handling)
- [Upgrading from 0.1.x to 0.2](#upgrading-from-01x-to-02)
- [Common issues](#common-issues)

## Requirements

| Setup | Needs |
| --- | --- |
| Odoo client only | Node.js 20+, NestJS 10 or 11, an Odoo instance. Redis is optional. |
| Domain services | Same as above |
| REST API / webhooks | Same as above, plus Redis and PostgreSQL |

## Installation

```bash
npm install @jhhornn/nestjs-odoo
# or
yarn add @jhhornn/nestjs-odoo
```

Peer dependencies you probably already have: `@nestjs/common`, `@nestjs/core`, `@nestjs/config`,
`@nestjs/swagger`, `class-validator`, `class-transformer`, `reflect-metadata` and `rxjs`.

## Choose a setup

| You want to… | Import |
| --- | --- |
| Call Odoo from your own services | `OdooModule.forRoot()` |
| Use `PartnerService`, `InvoiceService`, … in your own code | `OdooModule.forRoot()` + `OdooServicesModule` |
| Expose the packaged REST API to other systems | The full setup in [section 3](#3-full-integration-with-rest-api-and-webhooks) |

## 1. Odoo client only

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { OdooModule } from '@jhhornn/nestjs-odoo';

@Module({
  imports: [
    OdooModule.forRoot({
      url: 'https://your-company.odoo.com',
      database: 'your_database',
      username: 'integration@example.com',
      password: process.env.ODOO_API_KEY, // an Odoo API key, not a login password
      cache: false, // no Redis needed; set true to enable cachedSearchRead caching
    }),
  ],
})
export class AppModule {}
```

Any value you leave out is read from the environment (`ODOO_URL`, `ODOO_DATABASE`,
`ODOO_USERNAME`, `ODOO_PASSWORD`, `ODOO_TIMEOUT_MS`).

**Config from `ConfigService` or a secrets manager:**

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

OdooModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  cache: true, // uses REDIS_URL
  useFactory: (config: ConfigService) => ({
    url: config.getOrThrow('ODOO_URL'),
    database: config.getOrThrow('ODOO_DATABASE'),
    username: config.getOrThrow('ODOO_USERNAME'),
    password: config.getOrThrow('ODOO_PASSWORD'),
    timeoutMs: 15_000,
  }),
});
```

Plain `imports: [OdooModule]` still works: it reads environment variables and enables the
Redis cache (`REDIS_URL`, default `redis://localhost:6379`).

**Use the client:**

```typescript
import { Injectable } from '@nestjs/common';
import { OdooService } from '@jhhornn/nestjs-odoo';

@Injectable()
export class CustomerService {
  constructor(private readonly odoo: OdooService) {}

  findCustomers() {
    return this.odoo.searchRead(
      'res.partner',
      [{ field: 'customer_rank', operator: '>', value: 0 }],
      { fields: ['id', 'name', 'email'], limit: 50, order: 'name asc' },
    );
  }

  createCustomer(name: string, email: string) {
    return this.odoo.create('res.partner', { name, email, customer_rank: 1 });
  }

  postInvoice(invoiceId: number) {
    // Any model method is reachable through executeKw
    return this.odoo.executeKw('account.move', 'action_post', [[invoiceId]]);
  }
}
```

For a model without a packaged service, `OdooServiceFactory.createForModel('sale.order')`
returns a ready-made CRUD service. You can also extend `BaseOdooService`, as described in
[Extending](https://github.com/jhhornn/odoo/blob/main/docs/extending.md).

## 2. Domain services without HTTP routes

`OdooServicesModule` provides `PartnerService`, `ProductService`, `InvoiceService`,
`PaymentService` and `TaxService`. It registers **no controllers** and needs no PostgreSQL.

```typescript
import { Module } from '@nestjs/common';
import { OdooModule, OdooServicesModule } from '@jhhornn/nestjs-odoo';

@Module({
  imports: [OdooModule.forRoot({ cache: false }), OdooServicesModule],
})
export class AppModule {}
```

```typescript
import { Injectable } from '@nestjs/common';
import { PartnerService } from '@jhhornn/nestjs-odoo';

@Injectable()
export class BillingService {
  constructor(private readonly partners: PartnerService) {}

  syncCustomer(ref: string, name: string, email: string) {
    // Idempotent create-or-update keyed by your system's reference
    return this.partners.upsert({
      external_ref: ref,
      name,
      email,
      partner_type: 'customer',
    });
  }
}
```

## 3. Full integration with REST API and webhooks

This setup adds the packaged HTTP controllers, PostgreSQL-backed API keys, Redis rate
limiting, and BullMQ webhook delivery.

### Register the modules

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import {
  AuthModule,
  DatabaseModule,
  InvoiceModule,
  OdooApiModule,
  OdooModule,
  PartnerModule,
  PaymentModule,
  ProductModule,
  RedisModule,
  TaxModule,
  WebhookModule,
} from '@jhhornn/nestjs-odoo';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get('REDIS_URL', 'redis://localhost:6379') },
      }),
    }),
    DatabaseModule, // PostgreSQL (Prisma) for API keys and webhooks
    RedisModule, // rate limiting, API-key cache, Odoo cache
    OdooModule,
    AuthModule, // /admin/api-keys
    WebhookModule, // /admin/webhooks, /webhooks
    PartnerModule, // /partners
    ProductModule, // /products
    InvoiceModule, // /invoices
    PaymentModule, // /payments
    TaxModule, // /taxes

    // Optional: generic CRUD for arbitrary models under /odoo/*
    OdooApiModule.register({
      allowedModels: ['res.partner', 'product.product', 'sale.order'],
      requiredScopes: ['odoo:generic'],
    }),
  ],
})
export class AppModule {}
```

Enable request validation in `main.ts`. The packaged DTOs rely on it:

```typescript
app.useGlobalPipes(
  new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
);
```

### Configure the environment

```dotenv
ODOO_URL=https://your-company.odoo.com
ODOO_DATABASE=your_database
ODOO_USERNAME=integration@example.com
ODOO_PASSWORD=your_odoo_api_key

DATABASE_URL=postgresql://postgres:password@localhost:5432/odoo_sync?schema=public
REDIS_URL=redis://localhost:6379
APP_SECRET=a-long-random-string-used-to-encrypt-webhook-secrets
```

### Apply the packaged database migrations

```bash
npx prisma@6 migrate deploy \
  --schema node_modules/@jhhornn/nestjs-odoo/prisma/schema.prisma
```

### Create the first admin API key

Every packaged route requires an API key, including the routes that manage keys. Create the
first `admin` key with a one-off script:

```typescript
// scripts/create-admin-key.ts
import { NestFactory } from '@nestjs/core';
import { ApiKeyService } from '@jhhornn/nestjs-odoo';
import { AppModule } from '../src/app.module';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const { key } = await app.get(ApiKeyService).create({
    systemName: 'platform-admin',
    scopes: ['admin'],
  });
  console.log(key); // shown once; only a hash is stored
  await app.close();
}
main();
```

Then create a key for each integrating system:

```bash
curl -X POST https://your-api/admin/api-keys \
  -H "X-API-Key: $ADMIN_KEY" -H "Content-Type: application/json" \
  -d '{"systemName":"billing-service","scopes":["read","write"]}'
```

Callers send their key as `X-API-Key: <key>` or `Authorization: Bearer <key>`.

## Security model

- **Every packaged controller authenticates itself.** It applies `ApiKeyGuard`, `RateLimitGuard`
  and `ScopeGuard` through the `@ApiKeyAuth()` decorator. You do not need a global guard, and
  importing a module never exposes unauthenticated routes. Admin routes (`/admin/*`) need the
  `admin` scope.
- **Generic model access is opt-in.** `OdooModule` registers no routes. `OdooApiModule.register()`
  exposes `/odoo/:model/*` and acts with the full permissions of your Odoo integration user.
  Always pass `allowedModels`. The integration user should also have the narrowest Odoo access
  rights that work.
- **Limits.** `limit` query parameters are capped at 1000 (`MAX_PAGE_LIMIT`). Odoo calls time out
  after 30 s by default (`ODOO_TIMEOUT_MS`).
- **No internals in responses.** Odoo tracebacks are logged server-side. API clients receive only a
  one-line summary such as `ValidationError: …`.
- **Webhooks are SSRF-hardened.** They are HTTPS only. Private, loopback, link-local, CGNAT and
  IPv6-internal addresses are rejected at registration and again at connect time, which defeats
  DNS rebinding. Redirects are never followed. Signing secrets are encrypted at rest with
  AES-256-GCM using `APP_SECRET`.
- **API keys are hashed.** They are stored as scrypt hashes and validated in constant time.
  Unknown keys are rejected before any expensive hashing.

**Protect your own controllers the same way:**

```typescript
import { Controller, Get, Module } from '@nestjs/common';
import { ApiKeyAuth, AuthModule, GetApiKeyContext, ApiKeyContext, Public } from '@jhhornn/nestjs-odoo';

@ApiKeyAuth('reports:read') // scopes are optional
@Controller('reports')
export class ReportsController {
  @Get()
  list(@GetApiKeyContext() caller: ApiKeyContext) {
    return { caller: caller.systemName };
  }

  @Public() // opt a single route out
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({ imports: [AuthModule], controllers: [ReportsController] })
export class ReportsModule {}
```

You can still register `ApiKeyGuard` as a global `APP_GUARD`. The guards detect a request that
is already authenticated and skip re-validating or double-counting it. Use `@Public()` for
routes that should stay open.

## Receiving webhooks

Each delivery carries `X-Webhook-Signature: t=<ms>,v1=<hex>`, `X-Webhook-ID` and
`X-Webhook-Event` headers. Verify the signature against the **raw** request body:

```typescript
import { verifySignature } from '@jhhornn/nestjs-odoo';

// e.g. NestFactory.create(AppModule, { rawBody: true }) and req.rawBody
const ok = verifySignature(
  req.rawBody.toString('utf8'),
  process.env.WEBHOOK_SECRET, // returned once when the webhook was registered
  req.headers['x-webhook-signature'],
); // false for bad, stale (> 5 min) or malformed signatures; never throws
```

Use `X-Webhook-ID` to de-duplicate retried deliveries.

## Configuration reference

| Variable | Default | Used by |
| --- | --- | --- |
| `ODOO_URL` | `http://localhost:8069` | `OdooModule`. A path prefix is supported, e.g. `https://host/odoo`. |
| `ODOO_DATABASE` | (required) | `OdooModule` |
| `ODOO_USERNAME` | (required) | `OdooModule` |
| `ODOO_PASSWORD` | (required) | `OdooModule`. Use an Odoo API key. |
| `ODOO_TIMEOUT_MS` | `30000` | `OdooModule` |
| `REDIS_URL` | `redis://localhost:6379` | `RedisModule`, `OdooModule` (cache) |
| `DATABASE_URL` | (required) | `DatabaseModule` |
| `APP_SECRET` | (required for webhooks) | Encrypts webhook signing secrets |
| `RATE_LIMIT_DEFAULT_MAX` | `100` | Requests per minute per key (`default` tier) |
| `RATE_LIMIT_PREMIUM_MAX` | `500` | Requests per minute per key (`premium` tier) |

Explicit `OdooModule.forRoot()` options take precedence over environment variables.

## Error handling

Odoo failures raise `OdooException`, a Nest `HttpException`, with a machine-readable `code`:

| `code` | HTTP | Meaning |
| --- | --- | --- |
| `INVALID_CREDENTIALS` / `AUTHENTICATION_FAILED` | 401 | Odoo rejected the configured credentials |
| `API_ERROR` | 400 | Odoo returned a fault (validation, access rights, missing record, …) |
| `CONNECTION_ERROR` | 502 / 504 | Odoo unreachable, or it did not answer within `timeoutMs` |
| `RECORD_NOT_FOUND` | 404 | Returned by domain services for missing records |

```typescript
import { OdooErrorCode, OdooException } from '@jhhornn/nestjs-odoo';

try {
  await odoo.create('res.partner', values);
} catch (e) {
  if (e instanceof OdooException && e.isCode(OdooErrorCode.CONNECTION_ERROR)) {
    // retry later
  }
  throw e;
}
```

## Upgrading from 0.1.x to 0.2

1. **Generic `/odoo/*` routes are no longer registered by `OdooModule`.** If you used them, add
   `OdooApiModule.register({ allowedModels: [...] })`.
2. **Packaged routes now require an API key, even without a global guard.** Callers that were
   reaching them unauthenticated get `401`. Issue keys as described in
   [Create the first admin API key](#create-the-first-admin-api-key).
3. **Domain modules no longer import `OdooModule` themselves.** Make sure your root module imports
   `OdooModule` (or `OdooModule.forRoot()`) once.
4. **Existing API keys keep working.** Their lookup identifier is upgraded automatically on first
   use. No database migration is required.
5. `upsert()` / `createPayment()` now take the caller context as an *optional* second argument.
   Webhooks are emitted only when it is provided and `WebhookModule` is registered.

## Common issues

**`ODOO_DATABASE is required` at startup:** pass the value to `OdooModule.forRoot()` or set the
environment variable before Nest initializes `OdooModule`.

**Redis connection errors:** start Redis, set `REDIS_URL`, or use
`OdooModule.forRoot({ cache: false })` if you only need the Odoo client.

**`401 Authentication required` on packaged routes:** send `X-API-Key`. Every packaged route is
protected; see [Security model](#security-model).

**`403 Model '…' is not exposed by this API`:** add the model to `OdooApiModule.register({ allowedModels })`.

**Missing database tables:** apply the packaged Prisma migrations before using authentication or webhooks.

## Documentation

- [Getting started](https://github.com/jhhornn/odoo/blob/main/docs/getting-started.md)
- [API reference](https://github.com/jhhornn/odoo/blob/main/docs/api-reference.md)
- [Integration guide](https://github.com/jhhornn/odoo/blob/main/docs/integration-guide.md)
- [Extending and library usage](https://github.com/jhhornn/odoo/blob/main/docs/extending.md)
- [Changelog](https://github.com/jhhornn/odoo/blob/main/CHANGELOG.md)

## Standalone server development

```bash
git clone https://github.com/jhhornn/odoo.git
cd odoo
yarn install
cp .env.example .env
yarn prisma:migrate && yarn prisma:seed   # writes local keys to .seed-keys
yarn start:dev
```

Swagger is available at `http://localhost:3000/doc` outside production. Set
`ODOO_API_ALLOWED_MODELS=res.partner,product.product` to restrict the generic routes.

## License

MIT
