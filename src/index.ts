/**
 * @nestjs-odoo/core
 * Enterprise Odoo integration for NestJS
 *
 * @packageDocumentation
 */

// Core module
export { OdooModule } from './odoo/odoo.module';
export { PartnerModule } from './partner/partner.module';
export { ProductModule } from './product/product.module';
export { InvoiceModule } from './invoice/invoice.module';

// Services
export { OdooService } from './odoo/odoo.service';
export { BaseOdooService } from './common/services/base.service';
export { InvoiceService } from './invoice/invoice.service';
export { PartnerService } from './partner/partner.service';
export { ProductService } from './product/product.service';

// Configuration
export { OdooConfigService } from './odoo/infrastructure/config/odoo.config';

// Exceptions
export {
  OdooException,
  OdooErrorCode,
} from './odoo/infrastructure/exceptions/odoo.exception';

// Factories
export { XmlRpcClientFactory } from './odoo/factories/xml-rpc-client.factory';
export { OdooServiceFactory } from './odoo/factories/odoo-service.factory';

// Types & Interfaces
export * from './odoo/interfaces';
export type { IOdooClient } from './odoo/interfaces/odoo-client.interface';

// DTOs
export * from './odoo/dto';
export * from './partner/dto';
export * from './product/dto';
export * from './invoice/dto';
