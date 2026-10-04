import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IApiKeyProvider, API_KEY_PROVIDER } from '../interfaces';
import {
  ERR_AUTHENTICATION_REQUIRED,
  IS_PUBLIC_KEY,
  LOG_API_KEY_USED,
} from '../../common/constants';

const MAX_API_KEY_LENGTH = 256;

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @Inject(API_KEY_PROVIDER)
    private readonly apiKeyProvider: IApiKeyProvider,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Already authenticated by an earlier (e.g. global) instance of this guard
    if (request.apiKeyContext) return true;

    const authHeader = request.headers['authorization'] as string;
    const xApiKey = request.headers['x-api-key'] as string;

    let rawKey: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      rawKey = authHeader.slice(7).trim();
    } else if (typeof xApiKey === 'string') {
      rawKey = xApiKey.trim();
    }

    // Reject missing or absurdly long keys before any hashing work
    if (!rawKey || rawKey.length > MAX_API_KEY_LENGTH) {
      throw new UnauthorizedException(ERR_AUTHENTICATION_REQUIRED);
    }

    const keyContext = await this.apiKeyProvider.validate(rawKey);
    if (!keyContext) {
      throw new UnauthorizedException(ERR_AUTHENTICATION_REQUIRED);
    }

    // Attach context to request for downstream use
    request.apiKeyContext = keyContext;

    // Log usage without exposing the key
    this.logger.log({
      msg: LOG_API_KEY_USED,
      keyId: keyContext.keyId,
      systemName: keyContext.systemName,
      ip: request.ip,
      endpoint: `${request.method} ${request.path}`,
    });

    return true;
  }
}
