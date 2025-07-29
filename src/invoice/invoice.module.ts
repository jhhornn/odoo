import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoicesController } from './invoice.controller';
import { OdooService } from 'src/odoo/odoo.service';
import { XmlRpcClientFactory } from 'src/odoo/factories/xml-rpc-client.factory';

@Module({
  controllers: [InvoicesController],
  providers: [InvoiceService, OdooService, XmlRpcClientFactory],
})
export class InvoiceModule {}
