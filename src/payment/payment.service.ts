import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OdooService } from '../odoo/odoo.service';
import { WebhookService } from '../common/services/webhook.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiKeyContext } from '../auth/interfaces';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly odooService: OdooService,
    private readonly webhookService: WebhookService,
  ) {}

  async createPayment(dto: CreatePaymentDto, context: ApiKeyContext) {
    const result = await this.executeCreate(dto, context);
    await this.webhookService.notify(context, {
      event: result.created ? 'payment.created' : 'payment.exists',
      status: 'success',
      model: 'account.payment',
      externalRef: dto.external_ref,
      paymentId: result.paymentId,
      data: result,
    });
    return result;
  }

  private async executeCreate(dto: CreatePaymentDto, context: ApiKeyContext) {
    // Check if payment already exists by ref
    const paymentDomain: any[] = [
      { field: 'ref', operator: '=', value: dto.external_ref },
    ];
    if (context.companyId) {
      paymentDomain.push({
        field: 'company_id',
        operator: '=',
        value: context.companyId,
      });
    }
    const existing = await this.odooService.searchRead(
      'account.payment',
      paymentDomain,
      {
        fields: ['id', 'name', 'ref', 'state', 'amount'],
        limit: 1,
      },
    );

    if (existing && existing.length > 0) {
      this.logger.log(
        `Payment ${dto.external_ref} already exists (ID: ${existing[0].id})`,
      );
      return {
        paymentId: existing[0].id,
        created: false,
        action: 'already_exists',
      };
    }

    // Resolve the invoice
    const invoiceId = await this.resolveInvoiceId(dto, context);

    const invoices = await this.odooService.read('account.move', [invoiceId], {
      fields: [
        'partner_id',
        'move_type',
        'amount_residual',
        'state',
        'currency_id',
      ],
    });
    if (!invoices || invoices.length === 0) {
      throw new BadRequestException(`Invoice ID ${invoiceId} not found`);
    }
    const invoice = invoices[0];
    if (invoice.state !== 'posted') {
      throw new BadRequestException(
        `Invoice ID ${invoiceId} must be in 'posted' state to register payment (current: '${invoice.state}')`,
      );
    }

    const isVendorBill = ['in_invoice', 'in_refund'].includes(
      invoice.move_type,
    );
    const paymentType =
      dto.payment_type || (isVendorBill ? 'outbound' : 'inbound');
    const partnerType =
      dto.partner_type || (isVendorBill ? 'supplier' : 'customer');

    const paymentValues: Record<string, any> = {
      payment_type: paymentType,
      partner_type: partnerType,
      partner_id: Array.isArray(invoice.partner_id)
        ? invoice.partner_id[0]
        : invoice.partner_id,
      amount: dto.amount,
      ref: dto.external_ref,
      company_id: context.companyId || false,
    };

    if (dto.ref) paymentValues.payment_reference = dto.ref;

    if (dto.payment_date) paymentValues.date = dto.payment_date;
    if (dto.journal_id) paymentValues.journal_id = dto.journal_id;
    if (invoice.currency_id) {
      paymentValues.currency_id = Array.isArray(invoice.currency_id)
        ? invoice.currency_id[0]
        : invoice.currency_id;
    }
    if (dto.extra_fields) Object.assign(paymentValues, dto.extra_fields);

    const paymentId = await this.odooService.create(
      'account.payment',
      paymentValues,
    );
    this.logger.log(
      `Created payment ${dto.external_ref} (ID: ${paymentId}) for invoice ${invoiceId}`,
    );

    let postError: string | undefined;
    try {
      await this.odooService.executeKw('account.payment', 'action_post', [
        [paymentId],
      ]);
      this.logger.log(`Posted payment ${paymentId}`);
    } catch (error: any) {
      // Odoo's action_post returns None, which XML-RPC can't serialize.
      // "cannot marshal None" means the action succeeded but the response couldn't be serialized.
      if (error.message?.includes('cannot marshal None')) {
        this.logger.log(
          `Posted payment ${paymentId} (action returned None — this is expected)`,
        );
      } else {
        postError = error.message;
        this.logger.warn(
          `Failed to post payment ${paymentId}: ${error.message}`,
        );
      }
    }

    const result: Record<string, any> = {
      paymentId: paymentId,
      created: true,
      action: 'created',
      invoiceId,
    };
    if (postError) {
      result.postFailed = true;
      result.postError = postError;
    }
    return result;
  }

  private async resolveInvoiceId(
    dto: CreatePaymentDto,
    context: ApiKeyContext,
  ): Promise<number> {
    if (dto.invoice_id) return dto.invoice_id;
    if (dto.invoice_external_ref) {
      const invoiceDomain: any[] = [
        { field: 'ref', operator: '=', value: dto.invoice_external_ref },
      ];
      if (context.companyId) {
        invoiceDomain.push({
          field: 'company_id',
          operator: '=',
          value: context.companyId,
        });
      }
      const invoices = await this.odooService.searchRead(
        'account.move',
        invoiceDomain,
        {
          fields: ['id'],
          limit: 1,
        },
      );
      if (invoices && invoices.length > 0) return invoices[0].id;
      throw new BadRequestException(
        `Invoice with external ref '${dto.invoice_external_ref}' not found`,
      );
    }
    throw new BadRequestException(
      'Either invoice_id or invoice_external_ref must be provided',
    );
  }
}
