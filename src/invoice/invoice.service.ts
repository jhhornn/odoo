import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import { WebhookEmitterService } from '../webhook/services/webhook-emitter.service';
import { ApiKeyContext } from '../auth/interfaces';
import {
  OdooException,
  OdooErrorCode,
} from '../odoo/infrastructure/exceptions/odoo.exception';
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto';
import {
  errRecordNotFound,
  errInvoiceStateBlocked,
  errPartnerRefNotFound,
  errProductRefNotFound,
  errCurrencyNotFound,
  ERR_PARTNER_OR_REF_REQUIRED,
  ACTION_CREATED,
  ACTION_UPDATED,
  ACTION_SKIPPED,
} from '../common/constants';

/**
 * Service for Invoice (account.move) operations
 */
@Injectable()
export class InvoiceService extends BaseOdooService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    odooService: OdooService,
    private readonly webhookEmitter: WebhookEmitterService,
  ) {
    super(odooService, 'account.move');
  }

  /**
   * Find draft customer invoices
   */
  async findDraftInvoices(limit = 100) {
    return this.searchRead(
      [
        { field: 'move_type', operator: '=', value: 'out_invoice' },
        { field: 'state', operator: '=', value: 'draft' },
      ],
      {
        fields: [
          'name',
          'ref',
          'partner_id',
          'invoice_date',
          'amount_total',
          'amount_residual',
          'state',
        ],
        limit,
        order: 'invoice_date desc',
      },
    );
  }

  /**
   * Find posted (confirmed) invoices
   */
  async findPostedInvoices(limit = 100) {
    return this.searchRead(
      [
        { field: 'move_type', operator: '=', value: 'out_invoice' },
        { field: 'state', operator: '=', value: 'posted' },
      ],
      {
        fields: [
          'name',
          'ref',
          'partner_id',
          'invoice_date',
          'invoice_date_due',
          'amount_total',
          'amount_residual',
          'payment_state',
        ],
        limit,
        order: 'invoice_date desc',
      },
    );
  }

  /**
   * Find unpaid invoices
   */
  async findUnpaidInvoices(limit = 100) {
    return this.searchRead(
      [
        { field: 'move_type', operator: '=', value: 'out_invoice' },
        { field: 'state', operator: '=', value: 'posted' },
        {
          field: 'payment_state',
          operator: 'in',
          value: ['not_paid', 'partial'],
        },
      ],
      {
        fields: [
          'name',
          'ref',
          'partner_id',
          'invoice_date',
          'invoice_date_due',
          'amount_total',
          'amount_residual',
          'payment_state',
        ],
        limit,
        order: 'invoice_date_due asc',
      },
    );
  }

  /**
   * Find vendor bills
   */
  async findVendorBills(limit = 100) {
    return this.searchRead(
      [{ field: 'move_type', operator: '=', value: 'in_invoice' }],
      {
        fields: [
          'name',
          'ref',
          'partner_id',
          'invoice_date',
          'amount_total',
          'state',
        ],
        limit,
        order: 'invoice_date desc',
      },
    );
  }

  /**
   * Confirm (post) an invoice. Only draft invoices can be confirmed.
   */
  async confirmInvoice(invoiceId: number) {
    const invoice = await this.findOne(invoiceId, ['id', 'state', 'name']);
    if (!invoice) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Invoice', invoiceId),
      );
    }
    if (invoice.state !== 'draft') {
      throw new OdooException(
        OdooErrorCode.VALIDATION_ERROR,
        errInvoiceStateBlocked(
          'confirm',
          invoice.name,
          invoice.state,
          'Only draft invoices can be confirmed.',
        ),
      );
    }
    return this.executeKw('action_post', [[invoiceId]]);
  }

  /**
   * Register payment for an invoice
   */
  async registerPayment(invoiceId: number, paymentData: any) {
    return this.executeKw(
      'action_register_payment',
      [[invoiceId]],
      paymentData,
    );
  }

  /**
   * Find invoices for a specific partner
   */
  async findByPartner(partnerId: number, limit = 50) {
    return this.searchRead(
      [
        { field: 'partner_id', operator: '=', value: partnerId },
        { field: 'move_type', operator: '=', value: 'out_invoice' },
      ],
      {
        fields: [
          'name',
          'ref',
          'invoice_date',
          'amount_total',
          'amount_residual',
          'state',
          'payment_state',
        ],
        limit,
        order: 'invoice_date desc',
      },
    );
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: {
    partner_id: number;
    move_type?: string;
    invoice_line_ids?: any[];
    [key: string]: any;
  }) {
    const invoiceData = {
      move_type: 'out_invoice',
      ...data,
    };
    return this.create(invoiceData);
  }

  /**
   * Update invoice (only draft invoices can be updated)
   */
  async updateInvoice(invoiceId: number, data: Record<string, any>) {
    const invoice = await this.findOne(invoiceId, ['id', 'state', 'name']);
    if (!invoice) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Invoice', invoiceId),
      );
    }
    if (invoice.state !== 'draft') {
      throw new OdooException(
        OdooErrorCode.VALIDATION_ERROR,
        errInvoiceStateBlocked(
          'update',
          invoice.name,
          invoice.state,
          'Only draft invoices can be updated. Reset to draft first.',
        ),
      );
    }
    return this.update(invoiceId, data);
  }

  /**
   * Delete an invoice (only draft invoices can be deleted)
   */
  async deleteInvoice(invoiceId: number) {
    const invoice = await this.findOne(invoiceId, ['id', 'state', 'name']);
    if (!invoice) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Invoice', invoiceId),
      );
    }
    if (invoice.state !== 'draft') {
      throw new OdooException(
        OdooErrorCode.VALIDATION_ERROR,
        errInvoiceStateBlocked(
          'delete',
          invoice.name,
          invoice.state,
          'Only draft invoices can be deleted. Cancel it first or reset to draft.',
        ),
      );
    }
    return this.delete(invoiceId);
  }

  /**
   * Cancel an invoice (only posted invoices can be cancelled)
   */
  async cancelInvoice(invoiceId: number) {
    const invoice = await this.findOne(invoiceId, ['id', 'state', 'name']);
    if (!invoice) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Invoice', invoiceId),
      );
    }
    if (invoice.state !== 'posted') {
      throw new OdooException(
        OdooErrorCode.VALIDATION_ERROR,
        errInvoiceStateBlocked(
          'cancel',
          invoice.name,
          invoice.state,
          'Only posted invoices can be cancelled.',
        ),
      );
    }
    return this.executeKw('button_cancel', [[invoiceId]]);
  }

  /**
   * Reset invoice to draft (only cancelled invoices can be reset)
   */
  async resetToDraft(invoiceId: number) {
    const invoice = await this.findOne(invoiceId, ['id', 'state', 'name']);
    if (!invoice) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Invoice', invoiceId),
      );
    }
    if (invoice.state !== 'cancel') {
      throw new OdooException(
        OdooErrorCode.VALIDATION_ERROR,
        errInvoiceStateBlocked(
          'reset',
          invoice.name,
          invoice.state,
          'Only cancelled invoices can be reset to draft.',
        ),
      );
    }
    return this.executeKw('button_draft', [[invoiceId]]);
  }

  /**
   * Upsert an invoice/bill from an external system.
   * Checks existence by external_ref (Odoo `ref` field), creates or updates (draft only).
   */
  async upsert(dto: UpsertInvoiceDto, context: ApiKeyContext) {
    const result = await this.executeUpsert(dto);
    await this.webhookEmitter.emit(
      context.systemName,
      result.created ? 'invoice.created' : 'invoice.updated',
      {
        model: 'account.move',
        externalRef: dto.external_ref,
        invoiceId: result.invoiceId,
        ...result,
      },
    );
    return result;
  }

  private async executeUpsert(dto: UpsertInvoiceDto) {
    const partnerId = await this.resolvePartnerId(dto);

    const invoiceDomain: any[] = [
      { field: 'ref', operator: '=', value: dto.external_ref },
    ];
    const existing = await this.odooService.searchRead(
      'account.move',
      invoiceDomain,
      {
        fields: ['id', 'name', 'ref', 'state'],
        limit: 1,
      },
    );

    if (existing && existing.length > 0) {
      const invoiceId = existing[0].id;
      if (existing[0].state !== 'draft') {
        this.logger.warn(
          `Invoice ${dto.external_ref} (ID: ${invoiceId}) is in '${existing[0].state}' state, cannot update`,
        );
        return {
          invoiceId: invoiceId,
          created: false,
          action: ACTION_SKIPPED,
          reason: `Invoice is in '${existing[0].state}' state`,
        };
      }
      const values: Record<string, any> = {};
      if (dto.invoice_date) values.invoice_date = dto.invoice_date;
      if (dto.invoice_date_due) values.invoice_date_due = dto.invoice_date_due;
      if (dto.narration) values.narration = dto.narration;
      if (dto.active !== undefined) values.active = dto.active;
      if (dto.extra_fields) Object.assign(values, dto.extra_fields);
      await this.odooService.write('account.move', [invoiceId], values);
      this.logger.log(`Updated invoice ${dto.external_ref} (ID: ${invoiceId})`);
      return { invoiceId: invoiceId, created: false, action: ACTION_UPDATED };
    }

    const invoiceLines = await this.buildUpsertLines(dto);
    const values: Record<string, any> = {
      move_type: dto.move_type,
      partner_id: partnerId,
      ref: dto.external_ref,
      invoice_line_ids: invoiceLines,
    };
    if (dto.invoice_date) values.invoice_date = dto.invoice_date;
    if (dto.invoice_date_due) values.invoice_date_due = dto.invoice_date_due;
    if (dto.narration) values.narration = dto.narration;
    if (dto.journal_id) values.journal_id = dto.journal_id;
    if (dto.extra_fields) Object.assign(values, dto.extra_fields);

    if (dto.currency_code) {
      const currencyId = await this.resolveCurrencyId(dto.currency_code);
      values.currency_id = currencyId;
    }

    const newId = await this.odooService.create('account.move', values);
    this.logger.log(`Created invoice ${dto.external_ref} (ID: ${newId})`);

    let autoPostError: string | undefined;
    if (dto.auto_post) {
      try {
        await this.odooService.executeKw('account.move', 'action_post', [
          [newId],
        ]);
        this.logger.log(
          `Auto-posted invoice ${dto.external_ref} (ID: ${newId})`,
        );
      } catch (error: any) {
        // Odoo's action_post returns None, which XML-RPC can't serialize.
        // "cannot marshal None" means the action succeeded but the response couldn't be serialized.
        if (error.message?.includes('cannot marshal None')) {
          this.logger.log(
            `Auto-posted invoice ${dto.external_ref} (ID: ${newId}) (action returned None — this is expected)`,
          );
        } else {
          autoPostError = error.message;
          this.logger.warn(
            `Failed to auto-post invoice ${newId}: ${error.message}`,
          );
        }
      }
    }

    const result: Record<string, any> = {
      invoiceId: newId,
      created: true,
      action: ACTION_CREATED,
    };
    if (autoPostError) {
      result.autoPostFailed = true;
      result.autoPostError = autoPostError;
    }
    if (dto.auto_post && !autoPostError) {
      const posted = await this.odooService.searchRead(
        'account.move',
        [{ field: 'id', operator: '=', value: newId }],
        { fields: ['name'], limit: 1 },
      );
      if (posted && posted.length > 0) {
        result.invoiceNumber = posted[0].name;
      }
    }
    return result;
  }

  private async resolvePartnerId(dto: UpsertInvoiceDto): Promise<number> {
    if (dto.partner_id) return dto.partner_id;
    if (dto.partner_external_ref) {
      const partnerDomain: any[] = [
        { field: 'ref', operator: '=', value: dto.partner_external_ref },
      ];
      const partners = await this.odooService.searchRead(
        'res.partner',
        partnerDomain,
        {
          fields: ['id'],
          limit: 1,
        },
      );
      if (partners && partners.length > 0) return partners[0].id;
      throw new BadRequestException(
        errPartnerRefNotFound(dto.partner_external_ref),
      );
    }
    throw new BadRequestException(ERR_PARTNER_OR_REF_REQUIRED);
  }

  private async buildUpsertLines(dto: UpsertInvoiceDto): Promise<any[]> {
    const lines: any[] = [];
    for (let i = 0; i < dto.lines.length; i++) {
      const line = dto.lines[i];
      const lineValues: Record<string, any> = {
        name: line.name,
        quantity: line.quantity,
        price_unit: line.price_unit,
      };
      if (line.product_id) {
        lineValues.product_id = line.product_id;
      } else if (line.product_external_ref) {
        const productDomain: any[] = [
          {
            field: 'default_code',
            operator: '=',
            value: line.product_external_ref,
          },
        ];
        const products = await this.odooService.searchRead(
          'product.product',
          productDomain,
          {
            fields: ['id'],
            limit: 1,
          },
        );
        if (products && products.length > 0) {
          lineValues.product_id = products[0].id;
        } else {
          throw new BadRequestException(
            errProductRefNotFound(line.product_external_ref, i + 1),
          );
        }
      }
      if (line.discount !== undefined) lineValues.discount = line.discount;
      if (line.account_id) lineValues.account_id = line.account_id;
      if (line.tax_ids) lineValues.tax_ids = line.tax_ids;
      lines.push([0, 0, lineValues]);
    }
    return lines;
  }

  private async resolveCurrencyId(currencyCode: string): Promise<number> {
    const currencies = await this.odooService.searchRead(
      'res.currency',
      [
        { field: 'name', operator: '=', value: currencyCode.toUpperCase() },
        { field: 'active', operator: '=', value: true },
      ],
      { fields: ['id'], limit: 1 },
    );
    if (!currencies || currencies.length === 0) {
      throw new BadRequestException(errCurrencyNotFound(currencyCode));
    }
    return currencies[0].id;
  }
}
