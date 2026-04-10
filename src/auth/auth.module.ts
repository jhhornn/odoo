import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { API_KEY_PROVIDER } from './interfaces';
import { EnvApiKeyProvider } from './providers';
import { ApiKeyGuard } from './guards';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: API_KEY_PROVIDER,
      useClass: EnvApiKeyProvider,
    },
    ApiKeyGuard,
  ],
  exports: [API_KEY_PROVIDER, ApiKeyGuard],
})
export class AuthModule {}
