import { Injectable, Logger } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import { WebhookEmitterService } from '../webhook/services/webhook-emitter.service';
import {
  OdooException,
  OdooErrorCode,
} from '../odoo/infrastructure/exceptions/odoo.exception';
import { UpsertPartnerDto } from './dto/upsert-partner.dto';
import { ApiKeyContext } from '../auth/interfaces';
import {
  errRecordNotFound,
  ACTION_CREATED,
  ACTION_UPDATED,
  ACTION_ALREADY_ARCHIVED,
  ACTION_ALREADY_ACTIVE,
} from '../common/constants';

/**
 * Service for Partner (res.partner) operations
 * Provides business logic for contacts and companies
 */
@Injectable()
export class PartnerService extends BaseOdooService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(
    odooService: OdooService,
    private readonly webhookEmitter: WebhookEmitterService,
  ) {
    super(odooService, 'res.partner');
  }

  /**
   * Find all company partners
   */
  async findCompanies(limit = 50) {
    return this.cachedSearchRead(
      [{ field: 'is_company', operator: '=', value: true }],
      {
        fields: [
          'name',
          'ref',
          'email',
          'phone',
          'website',
          'country_id',
          'vat',
        ],
        limit,
        order: 'name asc',
      },
    );
  }

  /**
   * Find all customer partners
   */
  async findCustomers(limit = 50) {
    return this.cachedSearchRead(
      [{ field: 'customer_rank', operator: '>', value: 0 }],
      {
        fields: [
          'name',
          'ref',
          'email',
          'phone',
          'customer_rank',
          'country_id',
        ],
        limit,
        order: 'customer_rank desc',
      },
    );
  }

  /**
   * Find all supplier partners
   */
  async findSuppliers(limit = 50) {
    return this.cachedSearchRead(
      [{ field: 'supplier_rank', operator: '>', value: 0 }],
      {
        fields: [
          'name',
          'ref',
          'email',
          'phone',
          'supplier_rank',
          'country_id',
        ],
        limit,
        order: 'supplier_rank desc',
      },
    );
  }

  /**
   * Find all partners that are either customers or vendors (or both)
   */
  async findAllContacts(limit = 50) {
    return this.cachedSearchRead(
      [
        '|',
        { field: 'customer_rank', operator: '>', value: 0 },
        { field: 'supplier_rank', operator: '>', value: 0 },
      ],
      {
        fields: [
          'name',
          'ref',
          'email',
          'phone',
          'customer_rank',
          'supplier_rank',
          'country_id',
        ],
        limit,
        order: 'name asc',
      },
    );
  }

  /**
   * Search partners by name or email
   */
  async searchByNameOrEmail(query: string, limit = 10, offset = 0) {
    return this.searchRead(
      [
        '|',
        { field: 'name', operator: 'ilike', value: query },
        { field: 'email', operator: 'ilike', value: query },
      ],
      {
        fields: ['name', 'ref', 'email', 'phone', 'is_company'],
        limit,
        offset,
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
        fields: ['name', 'ref', 'email', 'city', 'state_id'],
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
    const partner = await this.findOne(partnerId, ['id', 'name']);
    if (!partner) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Partner', partnerId),
      );
    }
    return this.update(partnerId, data);
  }

  /**
   * Delete a partner
   */
  async deletePartner(partnerId: number) {
    const partner = await this.findOne(partnerId, ['id', 'name']);
    if (!partner) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Partner', partnerId),
      );
    }
    return this.delete(partnerId);
  }

  /**
   * Archive a partner (soft delete)
   */
  async archivePartner(partnerId: number) {
    const partner = await this.findOne(partnerId, ['id', 'name', 'active']);
    if (!partner) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Partner', partnerId),
      );
    }
    if (!partner.active) {
      return { id: partnerId, action: ACTION_ALREADY_ARCHIVED };
    }
    return this.update(partnerId, { active: false });
  }

  /**
   * Unarchive a partner
   */
  async unarchivePartner(partnerId: number) {
    const partner = await this.findOne(partnerId, ['id', 'name', 'active']);
    if (!partner) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        errRecordNotFound('Partner', partnerId),
      );
    }
    if (partner.active) {
      return { id: partnerId, action: ACTION_ALREADY_ACTIVE };
    }
    return this.update(partnerId, { active: true });
  }

  /**
   * Upsert a customer/vendor from an external system.
   * Checks existence by external_ref (Odoo `ref` field), creates or updates accordingly.
   */
  async upsert(dto: UpsertPartnerDto, context: ApiKeyContext) {
    const result = await this.executeUpsert(dto);
    await this.webhookEmitter.emit(
      context.systemName,
      result.created ? 'partner.created' : 'partner.updated',
      {
        model: 'res.partner',
        externalRef: dto.external_ref,
        partnerId: result.partnerId,
        ...result,
      },
    );
    return result;
  }

  private async executeUpsert(dto: UpsertPartnerDto) {
    const domain: any[] = [
      { field: 'ref', operator: '=', value: dto.external_ref },
    ];
    const existing = await this.odooService.searchRead('res.partner', domain, {
      fields: ['id', 'name', 'ref'],
      limit: 1,
    });

    const values = this.buildUpsertValues(dto);

    if (existing && existing.length > 0) {
      const partnerId = existing[0].id;
      await this.odooService.write('res.partner', [partnerId], values);
      await this.odooService.invalidateModelCache('res.partner');
      this.logger.log(`Updated partner ${dto.external_ref} (ID: ${partnerId})`);
      return { partnerId: partnerId, created: false, action: ACTION_UPDATED };
    }

    const newId = await this.odooService.create('res.partner', {
      ...values,
      ref: dto.external_ref,
    });
    await this.odooService.invalidateModelCache('res.partner');
    this.logger.log(`Created partner ${dto.external_ref} (ID: ${newId})`);
    return { partnerId: newId, created: true, action: ACTION_CREATED };
  }

  private buildUpsertValues(dto: UpsertPartnerDto): Record<string, any> {
    const values: Record<string, any> = { name: dto.name };
    if (dto.email !== undefined) values.email = dto.email;
    if (dto.phone !== undefined) values.phone = dto.phone;
    if (dto.mobile !== undefined) values.mobile = dto.mobile;
    if (dto.is_company !== undefined) values.is_company = dto.is_company;
    if (dto.vat !== undefined) values.vat = dto.vat;
    if (dto.street !== undefined) values.street = dto.street;
    if (dto.city !== undefined) values.city = dto.city;
    if (dto.country_id !== undefined) values.country_id = dto.country_id;
    if (dto.active !== undefined) values.active = dto.active;
    if (dto.partner_type === 'customer') values.customer_rank = 1;
    else if (dto.partner_type === 'vendor') values.supplier_rank = 1;
    else if (dto.partner_type === 'both') {
      values.customer_rank = 1;
      values.supplier_rank = 1;
    }
    if (dto.extra_fields) Object.assign(values, dto.extra_fields);
    return values;
  }
}
