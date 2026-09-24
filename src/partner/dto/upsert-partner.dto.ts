import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsEnum,
  MaxLength,
} from 'class-validator';

export class UpsertPartnerDto {
  @ApiProperty({
    example: 'EXT-CUST-001',
    description:
      'Unique identifier from your external system. Used for idempotent upsert — if a partner with this ref exists, it will be updated. Stored as `ref` in Odoo.',
  })
  @IsString()
  @IsNotEmpty({ message: 'external_ref is required' })
  @MaxLength(255)
  external_ref: string;

  @ApiProperty({
    example: 'John Doe',
    description:
      'Display name. For companies, use the legal/trading name. For individuals, use full name.',
  })
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description:
      'Primary email address. Used for invoice delivery, communication, and Odoo portal access.',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '+254700000000',
    description: 'Primary landline/office phone number.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    example: '+254700000001',
    description:
      'Mobile phone number. Used for SMS notifications if configured in Odoo.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  mobile?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'If true, treated as a company/organization. If false, treated as an individual person. Companies can have child contacts (employees) linked to them.',
  })
  @IsBoolean()
  @IsOptional()
  is_company?: boolean;

  @ApiProperty({
    example: 'customer',
    enum: ['customer', 'vendor', 'both'],
    description:
      'Determines the partner role. **customer**: appears in sales/invoicing (sets customer_rank). **vendor**: appears in purchasing/bills (sets supplier_rank). **both**: visible in both sales and purchasing workflows.',
  })
  @IsEnum(['customer', 'vendor', 'both'], {
    message: 'partner_type must be one of: customer, vendor, both',
  })
  partner_type: 'customer' | 'vendor' | 'both';

  @ApiPropertyOptional({
    example: 'KE123456789A',
    description:
      'Tax Identification Number / VAT number. Displayed on invoices and used for fiscal reporting. Format depends on country (e.g. KE for Kenya, GB for UK).',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  vat?: string;

  @ApiPropertyOptional({
    example: '123 Main Street',
    description:
      'Street address line. Appears on printed invoices and delivery orders.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({
    example: 'Nairobi',
    description: 'City name. Used in the partner address block on documents.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  city?: string;

  @ApiPropertyOptional({
    example: 114,
    description:
      'Country ID in Odoo (res.country). Affects fiscal position, tax rules, and address formatting. Common IDs: Kenya=114, Uganda=229, Tanzania=218, US=233, UK=232.',
  })
  @IsNumber()
  @IsOptional()
  country_id?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'If false, the partner is archived (soft-deleted) — hidden from searches but historical records (invoices, payments) are preserved.',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'Additional Odoo fields to set directly on the partner record. Common fields: `property_payment_term_id` (payment terms), `property_account_receivable_id` (receivable account), `lang` (language code e.g. "en_US").',
    example: { property_payment_term_id: 1 },
  })
  @IsObject()
  @IsOptional()
  extra_fields?: Record<string, any>;
}
