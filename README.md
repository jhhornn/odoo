# @jhhornn/nestjs-odoo

NestJS modules and services for integrating with Odoo over XML-RPC.

## Requirements

- Node.js 20 or newer
- NestJS 10 or 11
- An accessible Odoo instance
- Redis for caching and rate limiting
- PostgreSQL when using authentication or webhooks

## Installation

```bash
npm install @jhhornn/nestjs-odoo
```

The package is public on npm. No custom registry or `.npmrc` configuration is required.

## Choose a setup

Use the core client if your application only needs to call Odoo. Use the complete
setup if you also need the packaged controllers, API-key authentication, domain
services, rate limiting, or webhooks.

## Core Odoo client

### 1. Configure the module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdooModule } from '@jhhornn/nestjs-odoo';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), OdooModule],
})
export class AppModule {}
```

`OdooModule` configures its Redis dependency using `REDIS_URL`.

### 2. Set environment variables

```dotenv
ODOO_URL=https://your-company.odoo.com
ODOO_DATABASE=your_database
ODOO_USERNAME=integration@example.com
ODOO_PASSWORD=your_odoo_api_key
REDIS_URL=redis://localhost:6379
```

Use an Odoo API key for `ODOO_PASSWORD` in production.

### 3. Use the service

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
      {
        fields: ['id', 'name', 'email'],
        limit: 50,
        order: 'name asc',
      },
    );
  }

  createCustomer(name: string, email: string) {
    return this.odoo.create('res.partner', {
      name,
      email,
      customer_rank: 1,
    });
  }
}
```

## Complete integration setup

The complete setup adds:

- Partner, product, invoice, payment, and tax modules
- PostgreSQL-backed API keys
- Redis-backed rate limiting and caching
- BullMQ webhook delivery

### 1. Import the infrastructure and domain modules

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import {
  AuthModule,
  DatabaseModule,
  InvoiceModule,
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
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
    OdooModule,
    AuthModule,
    WebhookModule,
    PartnerModule,
    ProductModule,
    InvoiceModule,
    PaymentModule,
    TaxModule,
  ],
})
export class AppModule {}
```

### 2. Configure the environment

```dotenv
ODOO_URL=https://your-company.odoo.com
ODOO_DATABASE=your_database
ODOO_USERNAME=integration@example.com
ODOO_PASSWORD=your_odoo_api_key

DATABASE_URL=postgresql://postgres:password@localhost:5432/odoo_sync?schema=public
REDIS_URL=redis://localhost:6379
```

### 3. Apply the packaged database migrations

Run this from the consuming application:

```bash
npx prisma@6 migrate deploy \
  --schema node_modules/@jhhornn/nestjs-odoo/prisma/schema.prisma
```

### 4. Use a domain service

```typescript
import { Injectable } from '@nestjs/common';
import { PartnerService } from '@jhhornn/nestjs-odoo';

@Injectable()
export class CustomersService {
  constructor(private readonly partners: PartnerService) {}

  list() {
    return this.partners.findCustomers(50);
  }
}
```

The domain modules also register their HTTP controllers. See the API reference for
the available routes and request bodies.

## Available exports

### Modules

- `OdooModule`
- `RedisModule`
- `DatabaseModule`
- `AuthModule`
- `WebhookModule`
- `PartnerModule`
- `ProductModule`
- `InvoiceModule`
- `PaymentModule`
- `TaxModule`

### Services

- `OdooService`
- `OdooServiceFactory`
- `BaseOdooService`
- `PartnerService`
- `ProductService`
- `InvoiceService`
- `PaymentService`
- `TaxService`
- `ApiKeyService`
- `WebhookEmitterService`
- `WebhookRegistryService`

DTOs, Odoo query interfaces, decorators, guards, factories, and typed exceptions are
also exported from the package root.

## Common issues

### Odoo configuration error

Confirm that `ODOO_DATABASE`, `ODOO_USERNAME`, and `ODOO_PASSWORD` are set
before Nest initializes `OdooModule`.

### Redis connection error

Start Redis locally or set `REDIS_URL` to an accessible Redis instance.

### Missing database tables

Apply the packaged Prisma migrations before using authentication or webhook modules.

### npm cannot find the package

Confirm npm is using the public registry:

```bash
npm config get registry
npm view @jhhornn/nestjs-odoo
```

The registry should be `https://registry.npmjs.org/`.

## Documentation

- [Getting started](https://github.com/jhhornn/odoo/blob/main/docs/getting-started.md)
- [API reference](https://github.com/jhhornn/odoo/blob/main/docs/api-reference.md)
- [Integration guide](https://github.com/jhhornn/odoo/blob/main/docs/integration-guide.md)
- [Extending and library usage](https://github.com/jhhornn/odoo/blob/main/docs/extending.md)

## Standalone server development

```bash
git clone https://github.com/jhhornn/odoo.git
cd odoo
yarn install
cp .env.example .env
yarn start:dev
```

Swagger is available at `http://localhost:3000/api`.

## License

MIT
