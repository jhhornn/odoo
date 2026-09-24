/**
 * @nestjs-odoo/core
 * Enterprise Odoo integration for NestJS.
 *
 * @packageDocumentation
 */

// Infrastructure
export { OdooModule } from './odoo/odoo.module';
export { RedisModule } from './redis/redis.module';
export * from './common/database';

// Domain modules
export { PartnerModule } from './partner/partner.module';
export { ProductModule } from './product/product.module';
export { InvoiceModule } from './invoice/invoice.module';
export { PaymentModule } from './payment/payment.module';
export { TaxModule } from './tax/tax.module';
export * from './auth';
export * from './webhook';

// Services
export { OdooService } from './odoo/odoo.service';
export { BaseOdooService } from './common/services/base.service';
export { PartnerService } from './partner/partner.service';
export { ProductService } from './product/product.service';
export { InvoiceService } from './invoice/invoice.service';
export { PaymentService } from './payment/payment.service';
export { TaxService } from './tax/tax.service';

// Configuration
export { OdooConfigService } from './odoo/infrastructure/config/odoo.config';

// Exceptions and factories
export {
  OdooException,
  OdooErrorCode,
} from './odoo/infrastructure/exceptions/odoo.exception';
export { XmlRpcClientFactory } from './odoo/factories/xml-rpc-client.factory';
export { OdooServiceFactory } from './odoo/factories/odoo-service.factory';

// Types and DTOs
export * from './odoo/interfaces';
export type { IOdooClient } from './odoo/interfaces/odoo-client.interface';
export * from './odoo/dto';
export * from './partner/dto';
export * from './product/dto';
export * from './invoice/dto';
export * from './payment/dto';
export * from './tax/dto';
