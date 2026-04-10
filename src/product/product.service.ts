import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import { WebhookService } from '../common/services/webhook.service';
import {
  OdooException,
  OdooErrorCode,
} from '../odoo/infrastructure/exceptions/odoo.exception';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { ApiKeyContext } from '../auth/interfaces';

/**
 * Service for Product (product.product) operations
 */
@Injectable()
export class ProductService extends BaseOdooService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    odooService: OdooService,
    private readonly webhookService: WebhookService,
  ) {
    super(odooService, 'product.product');
  }

  /**
   * Find products available for sale
   */
  async findAvailableProducts(limit = 100) {
    return this.searchRead(
      [
        { field: 'sale_ok', operator: '=', value: true },
        { field: 'active', operator: '=', value: true },
      ],
      {
        fields: [
          'name',
          'default_code',
          'list_price',
          'standard_price',
          'qty_available',
          'categ_id',
        ],
        limit,
        order: 'name asc',
      },
    );
  }

  /**
   * Find products in stock
   */
  async findInStock(limit = 100) {
    return this.searchRead(
      [{ field: 'qty_available', operator: '>', value: 0 }],
      {
        fields: [
          'name',
          'default_code',
          'list_price',
          'qty_available',
          'uom_id',
        ],
        limit,
        order: 'qty_available desc',
      },
    );
  }

  /**
   * Find products by category
   */
  async findByCategory(categoryId: number, limit = 100) {
    return this.searchRead(
      [{ field: 'categ_id', operator: '=', value: categoryId }],
      {
        fields: ['name', 'default_code', 'list_price', 'qty_available'],
        limit,
        order: 'name asc',
      },
    );
  }

  /**
   * Search products by name or reference
   */
  async searchProducts(query: string, limit = 20) {
    return this.searchRead(
      [
        '|',
        { field: 'name', operator: 'ilike', value: query },
        { field: 'default_code', operator: 'ilike', value: query },
      ],
      {
        fields: [
          'name',
          'default_code',
          'list_price',
          'qty_available',
          'categ_id',
        ],
        limit,
      },
    );
  }

  /**
   * Find products below reorder point
   */
  async findLowStock(threshold = 5, limit = 100) {
    return this.searchRead(
      [
        { field: 'qty_available', operator: '<=', value: threshold },
        { field: 'qty_available', operator: '>', value: 0 },
      ],
      {
        fields: ['name', 'default_code', 'qty_available', 'categ_id'],
        limit,
        order: 'qty_available asc',
      },
    );
  }

  /**
   * Update product price
   */
  async updatePrice(productId: number, newPrice: number) {
    if (newPrice < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
    const product = await this.findOne(productId, ['id', 'name']);
    if (!product) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        `Product ID ${productId} not found`,
      );
    }
    return this.update(productId, { list_price: newPrice });
  }

  /**
   * Create a new product
   */
  async createProduct(data: {
    name: string;
    type?: string;
    list_price?: number;
    standard_price?: number;
    categ_id?: number;
    [key: string]: any;
  }) {
    const productData = {
      type: 'product',
      sale_ok: true,
      purchase_ok: true,
      ...data,
    };
    return this.create(productData);
  }

  /**
   * Update product information
   */
  async updateProduct(productId: number, data: Record<string, any>) {
    const product = await this.findOne(productId, ['id', 'name']);
    if (!product) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        `Product ID ${productId} not found`,
      );
    }
    return this.update(productId, data);
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: number) {
    const product = await this.findOne(productId, ['id', 'name']);
    if (!product) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        `Product ID ${productId} not found`,
      );
    }
    return this.delete(productId);
  }

  /**
   * Archive a product
   */
  async archiveProduct(productId: number) {
    const product = await this.findOne(productId, ['id', 'name', 'active']);
    if (!product) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        `Product ID ${productId} not found`,
      );
    }
    if (!product.active) {
      return { id: productId, action: 'already_archived' };
    }
    return this.update(productId, { active: false });
  }

  /**
   * Unarchive a product
   */
  async unarchiveProduct(productId: number) {
    const product = await this.findOne(productId, ['id', 'name', 'active']);
    if (!product) {
      throw new OdooException(
        OdooErrorCode.RECORD_NOT_FOUND,
        `Product ID ${productId} not found`,
      );
    }
    if (product.active) {
      return { id: productId, action: 'already_active' };
    }
    return this.update(productId, { active: true });
  }

  /**
   * Update product stock quantity
   */
  async updateStock(productId: number, quantity: number, locationId?: number) {
    // This typically requires creating a stock.quant record
    // Simplified version - in real scenario you'd use inventory adjustment
    return this.executeKw('write', [[productId]], { qty_available: quantity });
  }

  /**
   * Upsert a plan/product from an external system.
   * Checks existence by external_ref (Odoo `default_code` field), creates or updates accordingly.
   */
  async upsert(dto: UpsertProductDto, context: ApiKeyContext) {
    const result = await this.executeUpsert(dto, context);
    await this.webhookService.notify(context, {
      event: result.created ? 'product.created' : 'product.updated',
      status: 'success',
      model: 'product.product',
      externalRef: dto.external_ref,
      productId: result.productId,
      data: result,
    });
    return result;
  }

  private async executeUpsert(dto: UpsertProductDto, context: ApiKeyContext) {
    const domain: any[] = [
      { field: 'default_code', operator: '=', value: dto.external_ref },
    ];
    if (context.companyId) {
      domain.push({
        field: 'company_id',
        operator: 'in',
        value: [context.companyId, false],
      });
    }
    const existing = await this.odooService.searchRead(
      'product.product',
      domain,
      {
        fields: ['id', 'name', 'default_code'],
        limit: 1,
      },
    );

    const values = this.buildUpsertValues(dto);

    if (existing && existing.length > 0) {
      const productId = existing[0].id;
      await this.odooService.write('product.product', [productId], values);
      this.logger.log(`Updated product ${dto.external_ref} (ID: ${productId})`);
      return { productId: productId, created: false, action: 'updated' };
    }

    const newId = await this.odooService.create('product.product', {
      ...values,
      default_code: dto.external_ref,
      company_id: context.companyId || false,
    });
    this.logger.log(`Created product ${dto.external_ref} (ID: ${newId})`);
    return { productId: newId, created: true, action: 'created' };
  }

  private buildUpsertValues(dto: UpsertProductDto): Record<string, any> {
    const values: Record<string, any> = { name: dto.name };
    if (dto.type !== undefined) values.type = dto.type;
    if (dto.list_price !== undefined) values.list_price = dto.list_price;
    if (dto.standard_price !== undefined)
      values.standard_price = dto.standard_price;
    if (dto.categ_id !== undefined) values.categ_id = dto.categ_id;
    if (dto.sale_ok !== undefined) values.sale_ok = dto.sale_ok;
    if (dto.purchase_ok !== undefined) values.purchase_ok = dto.purchase_ok;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.active !== undefined) values.active = dto.active;
    if (dto.extra_fields) Object.assign(values, dto.extra_fields);
    return values;
  }
}
