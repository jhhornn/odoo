import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPES_KEY = 'requiredScopes';

/**
 * Decorator to declare required scopes for a controller or route.
 * Use together with ScopeGuard.
 *
 * @example
 * ```typescript
 * @RequireScopes('admin')
 * @Controller('admin/api-keys')
 * export class ApiKeyController {}
 * ```
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);
