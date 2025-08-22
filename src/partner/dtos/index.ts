import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class PartnerDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Azure Interior' })
  name: string;

  @ApiPropertyOptional({ example: 'info@azure.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0123' })
  phone?: string;

  @ApiPropertyOptional({ example: true })
  is_company?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'customer_rank > 0 means customer',
  })
  customer_rank?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'supplier_rank > 0 means vendor',
  })
  supplier_rank?: number;

  @ApiPropertyOptional({ example: [233, 'United States'] })
  country_id?: [number, string];
}

export class CreatePartnerDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({ example: 'john@doe.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  phone?: string;

  @ApiPropertyOptional({ example: true })
  is_company?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Set >0 to mark as customer',
  })
  customer_rank?: number;

  @ApiPropertyOptional({ example: 0, description: 'Set >0 to mark as vendor' })
  supplier_rank?: number;

  @ApiPropertyOptional({ example: 233, description: 'res.country ID' })
  country_id?: number;
}

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {}

export class FilterPartnerDto {
  @ApiPropertyOptional({
    example: 'azure',
    description: 'Substring match on name',
  })
  name?: string;

  @ApiPropertyOptional({ example: 'info@azure.com' })
  email?: string;

  @ApiPropertyOptional({ example: true })
  is_company?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Only customers (customer_rank > 0) if set to 1',
  })
  customer_rank_gt?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Only vendors (supplier_rank > 0) if set to 1',
  })
  supplier_rank_gt?: number;

  @ApiPropertyOptional({ example: 50 })
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  offset?: number;

  @ApiPropertyOptional({
    example: ['name', 'email', 'phone', 'country_id'],
    description: 'Fields to return from Odoo',
    isArray: true,
    type: String,
  })
  fields?: string[];
}
