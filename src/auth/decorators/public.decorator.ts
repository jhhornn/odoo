import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../common/constants';

export { IS_PUBLIC_KEY };

/**
 * Mark a route or controller as public so `ApiKeyGuard` lets it through.
 * Useful when `ApiKeyGuard` is registered as a global `APP_GUARD`
 * (e.g. for health checks).
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * health() { return { ok: true }; }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
