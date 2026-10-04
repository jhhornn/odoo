/**
 * @jhhornn/nestjs-odoo
 * Enterprise Odoo integration for NestJS.
 *
 * @packageDocumentation
 */

// Infrastructure
export { OdooModule, OdooCoreModule } from './odoo/odoo.module';
export { OdooApiModule } from './odoo/odoo-api.module';
export { OdooServicesModule } from './common/services/odoo-services.module';
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
export {
  ODOO_MODULE_OPTIONS,
  ODOO_API_MODULE_OPTIONS,
  MAX_PAGE_LIMIT,
} from './common/constants/app.constants';

// Security helpers
export {
  OdooModelAccessGuard,
  ODOO_MODEL_NAME_PATTERN,
} from './odoo/guards/odoo-model-access.guard';
export { ParseLimitPipe } from './common/pipes/parse-limit.pipe';

// Exceptions and factories
export {
  OdooException,
  OdooErrorCode,
} from './odoo/infrastructure/exceptions/odoo.exception';
export { summarizeOdooFault } from './odoo/infrastructure/exceptions/odoo-fault.util';
export {
  XmlRpcClientFactory,
  OdooTimeoutError,
} from './odoo/factories/xml-rpc-client.factory';
export type { XmlRpcClientOptions } from './odoo/factories/xml-rpc-client.factory';
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
