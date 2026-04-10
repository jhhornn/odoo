import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { IApiKeyProvider, API_KEY_PROVIDER } from '../interfaces';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(API_KEY_PROVIDER)
    private readonly apiKeyProvider: IApiKeyProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const keyContext = await this.apiKeyProvider.validate(apiKey);
    if (!keyContext) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach context to request for downstream use
    request.apiKeyContext = keyContext;
    return true;
  }
}
