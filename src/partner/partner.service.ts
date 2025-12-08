import { Injectable } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';

/**
 * Service for Partner (res.partner) operations
 * Provides business logic for contacts and companies
 */
@Injectable()
export class PartnerService extends BaseOdooService {
  constructor(odooService: OdooService) {
    super(odooService, 'res.partner');
  }

  /**
   * Find all company partners
   */
  async findCompanies(limit = 50) {
    return this.searchRead(
      [{ field: 'is_company', operator: '=', value: true }],
      {
        fields: ['name', 'email', 'phone', 'website', 'country_id', 'vat'],
        limit,
        order: 'name asc',
      },
    );
  }

  /**
   * Find all customer partners
   */
  async findCustomers(limit = 50) {
    return this.searchRead(
      [{ field: 'customer_rank', operator: '>', value: 0 }],
      {
        fields: ['name', 'email', 'phone', 'customer_rank', 'country_id'],
        limit,
        order: 'customer_rank desc',
      },
    );
  }

  /**
   * Find all supplier partners
   */
  async findSuppliers(limit = 50) {
    return this.searchRead(
      [{ field: 'supplier_rank', operator: '>', value: 0 }],
      {
        fields: ['name', 'email', 'phone', 'supplier_rank', 'country_id'],
        limit,
        order: 'supplier_rank desc',
      },
    );
  }

  /**
   * Search partners by name or email
   */
  async searchByNameOrEmail(query: string, limit = 10) {
    return this.searchRead(
      [
        '|',
        { field: 'name', operator: 'ilike', value: query },
        { field: 'email', operator: 'ilike', value: query },
      ],
      {
        fields: ['name', 'email', 'phone', 'is_company'],
        limit,
      },
    );
  }

  /**
   * Find partners by country
   */
  async findByCountry(countryId: number, limit = 50) {
    return this.searchRead(
      [{ field: 'country_id', operator: '=', value: countryId }],
      {
        fields: ['name', 'email', 'city', 'state_id'],
        limit,
      },
    );
  }

  /**
   * Create a new partner
   */
  async createPartner(data: {
    name: string;
    email?: string;
    phone?: string;
    is_company?: boolean;
    [key: string]: any;
  }) {
    return this.create(data);
  }

  /**
   * Update partner information
   */
  async updatePartner(partnerId: number, data: Record<string, any>) {
    return this.update(partnerId, data);
  }

  /**
   * Delete a partner
   */
  async deletePartner(partnerId: number) {
    return this.delete(partnerId);
  }

  /**
   * Archive a partner (soft delete)
   */
  async archivePartner(partnerId: number) {
    return this.update(partnerId, { active: false });
  }

  /**
   * Unarchive a partner
   */
  async unarchivePartner(partnerId: number) {
    return this.update(partnerId, { active: true });
  }
}
