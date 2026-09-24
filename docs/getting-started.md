# Getting Started

This guide covers installation, configuration, and running the Odoo NestJS integration — either as a **standalone API server** or as a **library** in your own NestJS application.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [As a Standalone Server](#as-a-standalone-server)
  - [As a Library](#as-a-library)
- [Configuration](#configuration)
  - [Odoo Connection](#odoo-connection)
  - [Application](#application)
  - [Database & Redis](#database--redis)
  - [API Key Authentication](#api-key-authentication)
- [Running the Application](#running-the-application)
- [Swagger UI](#swagger-ui)

---

## Prerequisites

- **Node.js** ≥ 20.19
- **yarn**
- A running **Odoo** instance (v14+) with XML-RPC enabled
- Odoo user credentials with appropriate API permissions
- **PostgreSQL** (for API keys, webhook registrations, delivery logs)
- **Redis** (for caching, rate limiting, and BullMQ job queue)

---

## Installation

### As a Standalone Server

```bash
git clone <repository-url>
cd odoo
yarn install
```

### As a Library

```bash
yarn add @jhhornn/nestjs-odoo
```

Ensure your project has the required peer dependencies:

```bash
yarn add @nestjs/common @nestjs/core @nestjs/config @nestjs/swagger class-transformer class-validator reflect-metadata rxjs
```

---

## Configuration

Create a `.env` file in the project root (or set environment variables directly).

### Odoo Connection

| Variable | Required | Default | Description |
|---|---|---|---|
| `ODOO_URL` | No | `http://localhost:8069` | Odoo instance base URL |
| `ODOO_DATABASE` | **Yes** | — | Odoo database name |
| `ODOO_USERNAME` | **Yes** | — | Odoo user login (email) |
| `ODOO_PASSWORD` | **Yes** | — | Odoo user password or API key |

### Application

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment |

### Database & Redis

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL (caching, rate limiting, job queue) |

### API Key Authentication

All routes are protected by API key authentication. Every request must include a valid key via the `Authorization: Bearer <key>` header or the `X-API-Key` header.

API keys are **stored in the database** (PostgreSQL via Prisma). Only a SHA-256 hash is persisted — the plaintext key is shown once at creation time.

**Managing API keys:**

| Action | Method | Endpoint |
|---|---|---|
| Create a key | `POST` | `/admin/api-keys` |
| List keys (metadata only) | `GET` | `/admin/api-keys` |
| Revoke a key | `DELETE` | `/admin/api-keys/:id` |

When creating a key, the response includes the plaintext key (`sk_live_...`). Store it securely — it cannot be retrieved again.

**Rate Limiting:**

Every API key has a `rateLimitTier` (default: `"default"` = 100 req/min). Rate limiting uses a sliding-window algorithm backed by Redis. When exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header.

> **Seeding:** Run `yarn prisma:seed` to create initial API keys for development. The plaintext keys are printed to the console.

**Example `.env` file:**

```env
ODOO_URL=https://mycompany.odoo.com
ODOO_DATABASE=mycompany_prod
ODOO_USERNAME=admin@mycompany.com
ODOO_PASSWORD=my-api-key
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/odoo_sync?schema=public
REDIS_URL=redis://localhost:6379
```

---

## Running the Application

```bash
# Apply database migrations
yarn prisma:migrate

# Seed initial API keys (prints plaintext keys to console)
yarn prisma:seed

# Development (watch mode)
yarn start:dev

# Production
yarn build
yarn start:prod

# Run tests
yarn test

# Run e2e tests
yarn test:e2e
```

The API will be available at `http://localhost:3000`.

---

## Swagger UI

Interactive API documentation is available at:

```
http://localhost:3000/api
```

All endpoints are grouped by tags: **Odoo Generic**, **Partners**, **Products**, **Invoices**, **Payments**, **Odoo Model Metadata**. The Swagger UI supports try-it-out functionality and persistent authorization.
