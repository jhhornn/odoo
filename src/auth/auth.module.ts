import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { API_KEY_PROVIDER } from './interfaces';
import { ApiKeyProvider } from './providers';
import { ApiKeyGuard, RateLimitGuard } from './guards';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyController } from './controllers/api-key.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ApiKeyController],
  providers: [
    {
      provide: API_KEY_PROVIDER,
      useClass: ApiKeyProvider,
    },
    ApiKeyProvider,
    ApiKeyGuard,
    RateLimitGuard,
    ApiKeyService,
  ],
  exports: [API_KEY_PROVIDER, ApiKeyGuard, RateLimitGuard, ApiKeyService],
})
export class AuthModule {}
