import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Wireless Mouse',
    description: 'Name of the product',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'MOUSE-001',
    description: 'Internal reference code',
  })
  @IsString()
  @IsOptional()
  default_code?: string;

  @ApiPropertyOptional({
    example: 'product',
    enum: ['product', 'consu', 'service'],
    description:
      'Product type (product=storable, consu=consumable, service=service)',
    default: 'product',
  })
  @IsEnum(['product', 'consu', 'service'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    example: 29.99,
    description: 'Sales price',
    default: 1.0,
  })
  @IsNumber()
  @IsOptional()
  list_price?: number;

  @ApiPropertyOptional({
    example: 15.0,
    description: 'Cost price',
    default: 0.0,
  })
  @IsNumber()
  @IsOptional()
  standard_price?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Category ID (product.category)',
  })
  @IsNumber()
  @IsOptional()
  categ_id?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Can be sold',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sale_ok?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Can be purchased',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  purchase_ok?: boolean;

  @ApiPropertyOptional({
    example: 'High-quality wireless mouse with ergonomic design',
    description: 'Internal notes/description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
