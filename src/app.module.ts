import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OdooModule } from './odoo/odoo.module';
import { CommonModule } from './common/common.module';
import { PartnerModule } from './partner/partner.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ProductModule } from './product/product.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { ApiKeyGuard } from './auth/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OdooModule,
    CommonModule,
    AuthModule,
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
  ],
})
export class AppModule {}
