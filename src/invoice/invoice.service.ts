import { Injectable } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';

/**
 * Service for Invoice (account.move) operations
 */
@Injectable()
export class InvoiceService extends BaseOdooService {
  constructor(odooService: OdooService) {
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
        fields: ['name', 'partner_id', 'invoice_date', 'amount_total', 'state'],
        limit,
        order: 'invoice_date desc',
      },
    );
  }

  /**
   * Confirm (post) an invoice
   */
  async confirmInvoice(invoiceId: number) {
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
   * Update invoice
   */
  async updateInvoice(invoiceId: number, data: Record<string, any>) {
    return this.update(invoiceId, data);
  }

  /**
   * Delete an invoice (only draft invoices can be deleted)
   */
  async deleteInvoice(invoiceId: number) {
    return this.delete(invoiceId);
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: number) {
    return this.executeKw('button_cancel', [[invoiceId]]);
  }

  /**
   * Reset invoice to draft
   */
  async resetToDraft(invoiceId: number) {
    return this.executeKw('button_draft', [[invoiceId]]);
  }
}
