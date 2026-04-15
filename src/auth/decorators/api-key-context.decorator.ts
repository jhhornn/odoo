import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyContext } from '../interfaces';

/**
 * Parameter decorator to extract the API key context from the request.
 * Use in controller methods protected by ApiKeyGuard.
 *
 * @example
 * ```typescript
 * @Post()
 * async sync(@GetApiKeyContext() ctx: ApiKeyContext) {
 *   console.log(ctx.systemName);
 * }
 * ```
 */
export const GetApiKeyContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiKeyContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKeyContext;
  },
);
