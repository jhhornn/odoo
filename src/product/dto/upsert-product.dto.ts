import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertProductDto {
  @ApiProperty({
    example: 'EXT-PLAN-001',
    description:
      'Unique identifier from your external system. Used for idempotent upsert — if a product with this ref exists, it will be updated instead of duplicated. Stored as `default_code` in Odoo.',
  })
  @IsString()
  @IsNotEmpty({ message: 'external_ref is required' })
  @MaxLength(255)
  external_ref: string;

  @ApiProperty({
    example: 'Premium Health Plan',
    description: 'Display name shown in Odoo UI, invoices, and sales orders.',
  })
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'PLAN-PREM-001',
    description:
      'Internal reference/SKU used for barcode scanning, search, and inventory lookups. Separate from external_ref.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  default_code?: string;

  @ApiPropertyOptional({
    example: 'service',
    enum: ['product', 'consu', 'service'],
    description:
      'Determines how Odoo handles this item. **service**: no stock tracking (e.g. plans, consulting). **product**: fully stock-tracked, affects warehouse inventory. **consu**: consumable, sold/purchased but not tracked in stock.',
    default: 'service',
  })
  @IsEnum(['product', 'consu', 'service'], {
    message: 'type must be one of: product, consu, service',
  })
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    example: 5000.0,
    description:
      'Selling price shown to customers. Used as the default unit price on sales orders and customer invoices.',
  })
  @IsNumber({}, { message: 'list_price must be a number' })
  @IsOptional()
  @Min(0, { message: 'list_price cannot be negative' })
  list_price?: number;

  @ApiPropertyOptional({
    example: 3000.0,
    description:
      'Internal cost/purchase price. Used for margin calculations, vendor bills, and inventory valuation. Not visible to customers.',
  })
  @IsNumber({}, { message: 'standard_price must be a number' })
  @IsOptional()
  @Min(0, { message: 'standard_price cannot be negative' })
  standard_price?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Product category ID in Odoo (product.category). Categories control default accounting accounts, routes, and reporting groups. Omit to use the default "All" category.',
  })
  @IsNumber()
  @IsOptional()
  categ_id?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, this product can be sold to customers and will appear in sales orders and customer invoices. Set to false for internal-only or purchase-only items.',
  })
  @IsBoolean()
  @IsOptional()
  sale_ok?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, this product can be purchased from vendors and will appear in purchase orders and vendor bills. Set to false for items you only sell (e.g. service plans).',
  })
  @IsBoolean()
  @IsOptional()
  purchase_ok?: boolean;

  @ApiPropertyOptional({
    example: 'A premium healthcare plan',
    description: 'Product description (max 4000 chars)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'If false, the product is archived (soft-deleted) — hidden from searches and dropdowns but still exists in Odoo. Use this to disable a product without deleting historical records.',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'Additional Odoo fields to set directly on the product record. Use Odoo field names. For many2many fields like taxes, use the command format: `[[6, 0, [tax_id_1, tax_id_2]]]`.',
    example: { taxes_id: [[6, 0, [1]]] },
  })
  @IsObject()
  @IsOptional()
  extra_fields?: Record<string, any>;
}
