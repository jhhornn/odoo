import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdooService } from './odoo.service';
import { OdooController } from './odoo.controller';
import { PartnersController } from './model-specific.controller';
import { InvoicesController } from './invoice.controller';

@Module({
  imports: [ConfigModule],
  providers: [OdooService],
  controllers: [OdooController, PartnersController, InvoicesController],
  exports: [OdooService],
})
export class OdooModule {}
