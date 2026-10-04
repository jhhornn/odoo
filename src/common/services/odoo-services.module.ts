import { Module } from '@nestjs/common';
import { PartnerService } from '../../partner/partner.service';
import { ProductService } from '../../product/product.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { PaymentService } from '../../payment/payment.service';
import { TaxService } from '../../tax/tax.service';

const DOMAIN_SERVICES = [
  PartnerService,
  ProductService,
  InvoiceService,
  PaymentService,
  TaxService,
];

/**
 * Domain services (partners, products, invoices, payments, taxes) without any
 * HTTP routes, API keys or PostgreSQL. Requires only `OdooModule`.
 *
 * Webhook events are emitted only when `WebhookModule` is also registered.
 */
@Module({
  providers: DOMAIN_SERVICES,
  exports: DOMAIN_SERVICES,
})
export class OdooServicesModule {}
