import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OdooModule } from './odoo/odoo.module';
import { ConfigModule } from '@nestjs/config';
import { InvoiceModule } from './invoice/invoice.module';
import { PartnerModule } from './partner/partner.module';
import { ProductModule } from './product/product.module';
import appConfig from './app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    OdooModule,
    InvoiceModule,
    PartnerModule,
    ProductModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
