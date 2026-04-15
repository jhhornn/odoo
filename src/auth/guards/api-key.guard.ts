import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { IApiKeyProvider, API_KEY_PROVIDER } from '../interfaces';
import {
  ERR_AUTHENTICATION_REQUIRED,
  LOG_API_KEY_USED,
} from '../../common/constants';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @Inject(API_KEY_PROVIDER)
    private readonly apiKeyProvider: IApiKeyProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'] as string;
    const xApiKey = request.headers['x-api-key'] as string;

    let rawKey: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      rawKey = authHeader.slice(7);
    } else if (xApiKey) {
      rawKey = xApiKey;
    }

    if (!rawKey) {
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
