import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseOdooService } from '../odoo/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dtos';

@Injectable()
export class PartnerService extends BaseOdooService {
  constructor(odooService: OdooService) {
    super(odooService, 'res.partner');
  }

  async createPartner(dto: CreatePartnerDto) {
    // Optional validation: check if email already exists
    if (dto.email) {
      const existing = await this.searchRead(
        [{ field: 'email', operator: '=', value: dto.email }],
        { fields: ['id'], limit: 1 },
      );
      if (existing.length > 0) {
        throw new BadRequestException(
          `Partner with email ${dto.email} already exists`,
        );
      }
    }

    return this.create(dto);
  }

  async updatePartner(id: number, dto: UpdatePartnerDto) {
    const partner = await this.findOne(id);
    if (!partner) {
      throw new BadRequestException(`Partner with ID ${id} not found`);
    }

    return this.update(id, dto);
  }

  async deletePartner(id: number) {
    const partner = await this.findOne(id);
    if (!partner) {
      throw new BadRequestException(`Partner with ID ${id} not found`);
    }
    return this.delete(id);
  }

  async exists(id: number): Promise<boolean> {
    const partner = await this.findOne(id, ['id']);
    return !!partner;
  }
}
