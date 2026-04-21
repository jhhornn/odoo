import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_SCOPES_KEY } from '../decorators/require-scopes.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKeyContext = request.apiKeyContext;

    if (!apiKeyContext?.scopes) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasAllScopes = requiredScopes.every((scope) =>
      apiKeyContext.scopes.includes(scope),
    );

    if (!hasAllScopes) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
