// product.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseOdooService } from '../odoo/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import { CreateProductDto, UpdateProductDto } from './dtos';

@Injectable()
export class ProductService extends BaseOdooService {
  constructor(odooService: OdooService) {
    super(odooService, 'product.product');
  }

  async createProduct(dto: CreateProductDto) {
    if (dto.default_code) {
      const existing = await this.searchRead(
        [{ field: 'default_code', operator: '=', value: dto.default_code }],
        { fields: ['id'], limit: 1 },
      );
      if (existing.length > 0) {
        throw new BadRequestException(
          `Product with code ${dto.default_code} already exists`,
        );
      }
    }
    return this.create(dto);
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    const success = await this.update(id, dto);
    if (!success) {
      throw new BadRequestException(
        `Product with ID ${id} not found or update failed`,
      );
    }
    return success;
  }

  async deleteProduct(id: number) {
    const success = await this.delete(id);
    if (!success) {
      throw new BadRequestException(
        `Product with ID ${id} not found or delete failed`,
      );
    }
    return success;
  }

  async exists(id: number): Promise<boolean> {
    const product = await this.findOne(id, ['id']);
    return !!product;
  }
}
