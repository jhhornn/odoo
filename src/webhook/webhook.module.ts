import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookRegistryService } from './services/webhook-registry.service';
import { WebhookEmitterService } from './services/webhook-emitter.service';
import { WebhookDeliveryProcessor } from './processors/webhook-delivery.processor';
import { WebhookController } from './webhook.controller';
import { WebhookSelfServiceController } from './webhook-self-service.controller';
import { WEBHOOK_QUEUE } from '../common/constants';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  controllers: [WebhookController, WebhookSelfServiceController],
  providers: [
    WebhookRegistryService,
    WebhookEmitterService,
    WebhookDeliveryProcessor,
  ],
  exports: [WebhookEmitterService, WebhookRegistryService],
})
export class WebhookModule {}
