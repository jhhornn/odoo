import { Injectable } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import {
  OdooException,
  OdooErrorCode,
} from '../odoo/infrastructure/exceptions/odoo.exception';
import { errRecordNotFound } from '../common/constants';

/**
 * Service for Tax (account.tax) operations
 */
@Injectable()
export class TaxService extends BaseOdooService {
  constructor(odooService: OdooService) {
    super(odooService, 'account.tax');
  }

  private static readonly DEFAULT_FIELDS = [
    'id',
    'name',
    'amount',
    'amount_type',
    'type_tax_use',
    'description',
    'active',
    'company_id',
    'sequence',
    'price_include',
    'include_base_amount',
    'tax_group_id',
  ];

  /**
   * Find all sale (customer invoice) taxes
   */
  async findSaleTaxes(limit = 50) {
    return this.cachedSearchRead(
      [
        { field: 'type_tax_use', operator: '=', value: 'sale' },
        { field: 'active', operator: '=', value: true },
      ],
      {
        fields: TaxService.DEFAULT_FIELDS,
        limit,
        order: 'sequence asc',
      },
    );
  }

  /**
   * Find all purchase (vendor bill) taxes
   */
  async findPurchaseTaxes(limit = 50) {
    return this.cachedSearchRead(
      [
        { field: 'type_tax_use', operator: '=', value: 'purchase' },
        { field: 'active', operator: '=', value: true },
      ],
      {
        fields: TaxService.DEFAULT_FIELDS,
        limit,
        order: 'sequence asc',
      },
    );
  }

  /**
   * Find a single tax by ID
   */
  async findTaxById(taxId: number) {
    const tax = await this.findOne(taxId, TaxService.DEFAULT_FIELDS);
    if (!tax) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Tax', taxId),
      );
    }
    return tax;
  }

  /**
   * Search taxes by name
   */
  async searchByName(query: string, limit = 10) {
    return this.searchRead(
      [
        { field: 'name', operator: 'ilike', value: query },
        { field: 'active', operator: '=', value: true },
      ],
      {
        fields: TaxService.DEFAULT_FIELDS,
        limit,
      },
    );
  }
}
