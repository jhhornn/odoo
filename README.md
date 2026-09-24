# @nestjs-odoo/core

Enterprise-grade NestJS module for Odoo ERP integration via XML-RPC.

## Features

- **High Performance** — Optimized XML-RPC client with connection pooling
- **Type Safe** — Fully typed DTOs and responses
- **Easy Integration** — Plug-and-play NestJS module
- **Swagger Documentation** — Built-in Swagger UI when running as a server
- **Modular Design** — Import only the modules you need
- **Dual-Use** — Standalone API server or library in your own NestJS app
- **Database-Backed Auth** — API keys stored as SHA-256 hashes with prefix-based lookup
- **Reliable Webhooks** — HMAC-signed, BullMQ-queued delivery with automatic retries
- **Rate Limiting** — Sliding-window rate limiter per API key tier via Redis

---

## Quick Start

### As a Standalone Server

```bash
git clone <repository-url>
cd odoo
yarn install
cp .env.example .env   # Configure your Odoo connection
yarn start:dev          # http://localhost:3000
```

### As a Library

```bash
yarn add @nestjs-odoo/core
```

The package is published to GitHub Packages, so configure the `@nestjs-odoo`
scope in your project-level `.npmrc` before installing:

```ini
@nestjs-odoo:registry=https://npm.pkg.github.com
```

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  RedisModule,
  OdooModule,
  PartnerModule,
  ProductModule,
  InvoiceModule,
} from '@nestjs-odoo/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    OdooModule,
    PartnerModule,
    ProductModule,
    InvoiceModule,
  ],
})
export class AppModule {}
```

See [Getting Started](docs/getting-started.md) for full setup including environment variables and authentication.

---

## Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/getting-started.md) | Installation, configuration, environment variables, running the app |
| [API Reference](docs/api-reference.md) | Complete endpoint reference — generic Odoo, partners, products, invoices, payments |
| [Integration Guide](docs/integration-guide.md) | Sync workflows, webhooks, error handling, idempotency (for external system developers) |
| [Extending & Library Usage](docs/extending.md) | Using as an NPM library, adding custom modules, exported API |

---

## Architecture

```
src/
├── auth/        # API key authentication (hashed), rate limiting
├── common/      # Shared base service, decorators, interceptors, database (Prisma)
├── redis/       # Redis module (caching, rate limiting, BullMQ)
├── webhook/     # Webhook registry, HMAC-signed delivery via BullMQ
├── odoo/        # Core Odoo XML-RPC client and generic CRUD
├── partner/     # res.partner domain (customers, vendors, contacts)
├── product/     # product.product domain (products, plans)
├── invoice/     # account.move domain (invoices, bills)
└── payment/     # account.payment domain (payment registration)
```

---

## Sync Workflow

For external systems integrating with Odoo, the sync order is:

```
1. Partners     POST /partners        (customers & vendors)
2. Products     POST /products        (plans & physical goods)
3. Invoices     POST /invoices        (references partners + products)
4. Payments     POST /payments        (references posted invoices)
```

All sync endpoints are idempotent — safe to retry on failure. See the [Integration Guide](docs/integration-guide.md) for details.

---

## Swagger UI

Start the server and visit: **http://localhost:3000/api**

---

## License

MIT
