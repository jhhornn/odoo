import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class TaxDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'VAT 16%' })
  name: string;

  @ApiPropertyOptional({ example: 16.0 })
  amount?: number;

  @ApiPropertyOptional({
    example: 'percent',
    description: 'Tax computation type: percent, fixed, group, etc.',
  })
  amount_type?: string;

  @ApiPropertyOptional({
    example: 'sale',
    description: 'Tax scope: sale, purchase, or none',
  })
  type_tax_use?: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class FilterTaxDto {
  @ApiPropertyOptional({
    example: 'sale',
    enum: ['sale', 'purchase', 'none'],
    description:
      'Filter by tax scope: sale (customer), purchase (vendor), or none',
  })
  @IsString()
  @IsOptional()
  type_tax_use?: string;

  @ApiPropertyOptional({ example: 'VAT', description: 'Search by tax name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Filter by active status. Defaults to true (only active taxes).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

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
    example: ['id', 'name', 'amount', 'amount_type', 'type_tax_use'],
    description: 'Fields to return from Odoo',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}
