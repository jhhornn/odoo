// product.service.ts
import { Injectable } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';

/**
 * Service for Product (product.product) operations
 */
@Injectable()
export class ProductService extends BaseOdooService {
  constructor(odooService: OdooService) {
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
    return this.update(productId, data);
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: number) {
    return this.delete(productId);
  }

  /**
   * Archive a product
   */
  async archiveProduct(productId: number) {
    return this.update(productId, { active: false });
  }

  /**
   * Unarchive a product
   */
  async unarchiveProduct(productId: number) {
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
}
