import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdooService } from './odoo.service';
import { XmlRpcClientFactory } from './factories/xml-rpc-client.factory';
import { OdooServiceFactory } from './factories/odoo-service.factory';
import { OdooConfigService } from './infrastructure/config/odoo.config';
import { OdooController } from './odoo.controller';
import { OdooModelController } from './odoo-model.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    OdooService,
    OdooConfigService,
    XmlRpcClientFactory,
    OdooServiceFactory,
  ],
  controllers: [OdooController, OdooModelController],
  exports: [OdooService, OdooServiceFactory, OdooConfigService],
})
export class OdooModule {}
