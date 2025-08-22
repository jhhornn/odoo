import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoicesController } from './invoice.controller';
import { OdooService } from 'src/odoo/odoo.service';
import { XmlRpcClientFactory } from 'src/odoo/factories/xml-rpc-client.factory';
import { PartnerService } from 'src/partner/partner.service';
import { ProductService } from 'src/product/product.service';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoiceService,
    OdooService,
    XmlRpcClientFactory,
    PartnerService,
    ProductService,
  ],
})
export class InvoiceModule {}
