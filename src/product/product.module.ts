import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { OdooService } from 'src/odoo/odoo.service';
import { XmlRpcClientFactory } from 'src/odoo/factories/xml-rpc-client.factory';

@Module({
  controllers: [ProductController],
  providers: [ProductService, OdooService, XmlRpcClientFactory],
})
export class ProductModule {}
