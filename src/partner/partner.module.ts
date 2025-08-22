import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnersController } from './partner.controller';
import { XmlRpcClientFactory } from 'src/odoo/factories/xml-rpc-client.factory';
import { OdooService } from 'src/odoo/odoo.service';

@Module({
  controllers: [PartnersController],
  providers: [PartnerService, OdooService, XmlRpcClientFactory],
})
export class PartnerModule {}
