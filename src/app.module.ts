import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OdooModule } from './odoo/odoo.module';
import { PartnerModule } from './partner/partner.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ProductModule } from './product/product.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { ApiKeyGuard, RateLimitGuard } from './auth/guards';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './redis/redis.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
    OdooModule,
    AuthModule,
    WebhookModule,
    PartnerModule,
    InvoiceModule,
    ProductModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useExisting: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RateLimitGuard,
    },
  ],
})
export class AppModule {}
