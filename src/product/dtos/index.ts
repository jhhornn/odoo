// product.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 'Consulting Service' })
  name: string;

  @ApiPropertyOptional({ example: 'CONS-001' })
  default_code?: string;

  @ApiPropertyOptional({ example: 150.0 })
  list_price?: number;

  @ApiPropertyOptional({ example: 100.0 })
  standard_price?: number;

  @ApiPropertyOptional({ example: 'service', description: 'Type of product' })
  type?: 'consu' | 'service' | 'product';
}

export class CreateProductDto {
  @ApiProperty({ example: 'Consulting Service' })
  name: string;

  @ApiPropertyOptional({ example: 'CONS-001' })
  default_code?: string;

  @ApiPropertyOptional({ example: 150.0 })
  list_price?: number;

  @ApiPropertyOptional({ example: 100.0 })
  standard_price?: number;

  @ApiPropertyOptional({ example: 'service' })
  type?: 'consu' | 'service' | 'product';
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class FilterProductDto {
  @ApiPropertyOptional({ example: 'CONS', description: 'Search by name/code' })
  name?: string;

  @ApiPropertyOptional({ example: 'CONS-001' })
  default_code?: string;

  @ApiPropertyOptional({ example: 50 })
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  offset?: number;

  @ApiPropertyOptional({
    example: ['name', 'default_code', 'list_price'],
    description: 'Fields to return from Odoo',
    isArray: true,
    type: String,
  })
  fields?: string[];
}
