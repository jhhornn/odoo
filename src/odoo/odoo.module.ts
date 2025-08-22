import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdooService } from './odoo.service';
import { XmlRpcClientFactory } from './factories/xml-rpc-client.factory';
import { OdooServiceFactory } from './factories/odoo-service.factory';
import { OdooController } from './odoo.controller';
import { PartnersController } from '../partner/partner.controller';
import { InvoicesController } from '../invoice/invoice.controller';
import { PartnerService } from '../partner/partner.service';
import { InvoiceService } from '../invoice/invoice.service';
import { ProductService } from 'src/product/product.service';
// import { OdooModelController } from './odoo-model.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    OdooService,
    XmlRpcClientFactory,
    OdooServiceFactory,
    PartnerService,
    InvoiceService,
    ProductService,
  ],
  controllers: [
    OdooController,
    PartnersController,
    InvoicesController,
    // OdooModelController,
  ],
  exports: [OdooService, OdooServiceFactory],
})
export class OdooModule {}
