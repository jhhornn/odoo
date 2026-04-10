import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export * from './create-product.dto';
export * from './update-product.dto';

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

export class FilterProductDto {
  @ApiPropertyOptional({ example: 'CONS', description: 'Search by name/code' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'CONS-001' })
  @IsString()
  @IsOptional()
  default_code?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;

  @ApiPropertyOptional({
    example: ['name', 'default_code', 'list_price'],
    description: 'Fields to return from Odoo',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}
