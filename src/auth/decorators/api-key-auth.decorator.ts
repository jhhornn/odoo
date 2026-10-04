import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { ScopeGuard } from '../guards/scope.guard';
import { RequireScopes } from './require-scopes.decorator';

/**
 * Protect a controller or route with API-key authentication, per-key rate
 * limiting and (optionally) required scopes. Every packaged controller uses
 * this, so its routes are protected even without a global guard.
 *
 * The module that declares the controller must import `AuthModule`.
 *
 * @example
 * ```typescript
 * @ApiKeyAuth('write')
 * @Controller('orders')
 * export class OrdersController {}
 * ```
 */
export const ApiKeyAuth = (...scopes: string[]) =>
  applyDecorators(
    ApiSecurity('X-API-Key'),
    ...(scopes.length > 0 ? [RequireScopes(...scopes)] : []),
    UseGuards(ApiKeyGuard, RateLimitGuard, ScopeGuard),
  );
