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
  - [API Key Authentication](#api-key-authentication)
- [Running the Application](#running-the-application)
- [Swagger UI](#swagger-ui)

---

## Prerequisites

- **Node.js** ≥ 16
- **npm** or **yarn**
- A running **Odoo** instance (v14+) with XML-RPC enabled
- Odoo user credentials with appropriate API permissions

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
yarn add @nestjs-odoo/core
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

### API Key Authentication

All routes are protected by API key authentication. Every request must include a valid `X-API-Key` header.

| Variable | Required | Description | Example |
|---|---|---|---|
| `SYNC_API_KEY` | **Yes** | API key for the `X-API-Key` header | `abc123secret` |
| `SYNC_COMPANY_ID` | No | Odoo company ID to scope operations (default: `1`) | `1` |
| `SYNC_SYSTEM_NAME` | No | Identifier for the calling system (default: `default`) | `billing-platform` |
| `SYNC_WEBHOOK_URL` | No | URL for webhook callbacks on sync events | `https://ext.system/webhook` |
| `SYNC_WEBHOOK_TOKEN` | No | Secret token sent with webhook callbacks | `whk_secret` |

`SYNC_COMPANY_ID` scopes upsert operations to a specific Odoo company. In a multi-company Odoo setup, this ensures records belong to the correct company. For single-company setups, use `1`.

> **Extensibility:** Authentication is backed by the `IApiKeyProvider` interface. The default `EnvApiKeyProvider` reads from env vars. Implement `IApiKeyProvider` and swap the provider in `AuthModule` for multi-key or database-backed authentication.

**Example `.env` file:**

```env
ODOO_URL=https://mycompany.odoo.com
ODOO_DATABASE=mycompany_prod
ODOO_USERNAME=admin@mycompany.com
ODOO_PASSWORD=my-api-key
PORT=3000
SYNC_API_KEY=my-secret-key
SYNC_COMPANY_ID=1
```

---

## Running the Application

```bash
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
