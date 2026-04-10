import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookService } from './services/webhook.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class CommonModule {}
