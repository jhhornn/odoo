# Changelog

All notable changes to `@jhhornn/nestjs-odoo` are documented here.
The project follows [Semantic Versioning](https://semver.org/) (pre-1.0: minor versions may break).

## 0.2.0

### Breaking changes

- **Generic `/odoo/*` routes are opt-in.** `OdooModule` no longer registers `OdooController` or
  `OdooModelController`. Import `OdooApiModule.register({ allowedModels, requiredScopes })` to
  expose them.
- **Packaged routes enforce API-key auth themselves.** Every packaged controller applies
  `ApiKeyGuard`, `RateLimitGuard` and `ScopeGuard`. Before this, routes were open unless the host
  app registered a global guard.
- **Domain modules no longer import `OdooModule`.** Register `OdooModule` (or `OdooModule.forRoot()`)
  once in your root module.
- **New API keys use a different lookup identifier.** `api_keys.prefix` now stores 8 random characters
  instead of the constant `octo_odo`. Existing keys are upgraded on first use. No migration is
  needed.

### Security

- Fixed unauthenticated access to the domain, webhook self-service and generic Odoo routes when
  the package was used as a library without a global `APP_GUARD`.
- API-key validation no longer runs scrypt for unknown keys or cached keys. Before this, any
  request with an `octo_odo…` key forced a full scrypt hash, a CPU denial-of-service vector.
- Revocation now evicts cached keys reliably.
- Webhook delivery checks the exact address it connects to, which blocks DNS rebinding. It no
  longer follows redirects, and it caps response bodies.
- The SSRF blocklist now covers CGNAT (`100.64/10`), IPv6 unique-local and link-local addresses,
  IPv4-mapped IPv6 (`::ffff:127.0.0.1`), NAT64, multicast and reserved ranges, and bracketed IPv6
  literals. Webhook URLs with embedded credentials are rejected.
- `verifySignature` returns `false` instead of throwing on malformed or missing signature headers.
- Odoo tracebacks are no longer returned to API clients. They receive a one-line summary, and the
  full fault is logged.
- `limit` query parameters are capped at 1000. API keys longer than 256 characters are rejected
  before hashing.
- A warning is logged when `ODOO_URL` uses plain HTTP for a non-local host.

### Added

- `OdooModule.forRoot(options)` and `OdooModule.forRootAsync({ useFactory, inject })` for explicit
  configuration. Environment variables remain the fallback.
- `cache: false` option. Redis becomes optional when you only need the Odoo client.
- `OdooServicesModule` provides the domain services with no HTTP routes or PostgreSQL.
- `@ApiKeyAuth(...scopes)` decorator to protect your own controllers, and `@Public()` to exempt
  routes from a global `ApiKeyGuard`.
- `OdooApiModule` options: `allowedModels` and `requiredScopes`. Model names are validated.
- XML-RPC call timeout (`timeoutMs` / `ODOO_TIMEOUT_MS`, default 30 s), surfaced as
  `CONNECTION_ERROR` (504).
- `ODOO_URL` path prefixes (Odoo behind a reverse proxy) are supported.
- `RATE_LIMIT_PREMIUM_MAX` environment variable.
- Exported `UpsertPartnerDto`, `UpsertProductDto`, `UpsertInvoiceDto`, `ParseLimitPipe`,
  `OdooModelAccessGuard`, `OdooTimeoutError` and `summarizeOdooFault`.

### Fixed

- Concurrent first calls now share a single Odoo login.
- The client re-authenticates automatically after Odoo reports `AccessDenied` (e.g. a rotated
  API key).
- Unreachable Odoo maps to `CONNECTION_ERROR` (502) instead of a generic 400.
- `cachedSearchRead` falls back to Odoo when Redis is unavailable instead of failing the request.
- `/odoo/models/*` routes no longer get captured by `/odoo/:model/:id`.
- `RateLimitGuard` no longer requires a global `ConfigModule`.
- `upsert()` / `createPayment()` accept an optional caller context and work without
  `WebhookModule`.

### Tooling

- The publish workflow now publishes to npmjs.org with provenance. It previously targeted GitHub
  Packages.
- Added unit and HTTP-level tests for auth, SSRF, signatures, Odoo error handling and caching.

## 0.1.3

- Updated BullMQ and cleared the runtime audit.

## 0.1.2

- Initial public npm release.
