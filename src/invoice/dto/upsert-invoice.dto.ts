import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsEnum,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertInvoiceLineDto {
  @ApiProperty({
    example: 'Consulting Service',
    description: 'Line item description displayed on the invoice. If a product is linked, this overrides the product\'s default description.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Line description is required' })
  @MaxLength(4000)
  name: string;

  @ApiProperty({ example: 2, description: 'Number of units. Multiplied by price_unit (minus discount) to calculate the line total.' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity: number;

  @ApiProperty({ example: 1500.0, description: 'Price per unit in the invoice currency. Line total = quantity × price_unit × (1 - discount/100).' })
  @IsNumber({}, { message: 'Unit price must be a number' })
  price_unit: number;

  @ApiPropertyOptional({ example: 101, description: 'Odoo product ID (product.product). Links this line to a product for reporting and defaults (account, taxes). Optional — lines can be free-text without a product.' })
  @IsNumber()
  @IsOptional()
  product_id?: number;

  @ApiPropertyOptional({
    example: 'EXT-PLAN-001',
    description:
      'External product reference. The API looks up the product by `default_code` in Odoo. Use this instead of product_id when you only know the external ref.',
  })
  @IsString()
  @IsOptional()
  product_external_ref?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Discount percentage (0-100). Only supported on customer invoices (out_invoice).',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Account ID in Odoo (account.account). If omitted, Odoo uses the product or journal default.',
  })
  @IsNumber()
  @IsOptional()
  account_id?: number;

  @ApiPropertyOptional({
    description: 'Tax IDs to apply to this line using Odoo command format: `[[6, 0, [tax_id_1, tax_id_2]]]`. The `[6, 0, [...]]` command replaces all existing taxes. If omitted, Odoo uses the product\'s default taxes.',
    example: [[6, 0, [1]]],
  })
  @IsOptional()
  tax_ids?: any;
}

export class UpsertInvoiceDto {
  @ApiProperty({
    example: 'EXT-INV-001',
    description: 'Unique identifier from your external system. Used for idempotent upsert — if an invoice with this ref exists, it updates (draft only). Stored as `ref` in Odoo.',
  })
  @IsString()
  @IsNotEmpty({ message: 'external_ref is required' })
  @MaxLength(255)
  external_ref: string;

  @ApiProperty({
    example: 'out_invoice',
    enum: ['out_invoice', 'in_invoice', 'out_refund', 'in_refund'],
    description:
      'out_invoice = Customer Invoice, in_invoice = Vendor Bill, out_refund = Credit Note, in_refund = Debit Note',
  })
  @IsEnum(['out_invoice', 'in_invoice', 'out_refund', 'in_refund'], {
    message:
      'move_type must be one of: out_invoice, in_invoice, out_refund, in_refund',
  })
  move_type: string;

  @ApiPropertyOptional({ example: 7, description: 'Odoo partner ID (res.partner). The customer/vendor this invoice is billed to. Provide either this or partner_external_ref — not both.' })
  @IsNumber()
  @IsOptional()
  partner_id?: number;

  @ApiPropertyOptional({
    example: 'EXT-CUST-001',
    description:
      'External partner reference. The API looks up the partner by `ref` field in Odoo. Use this instead of partner_id when you only know the external system ID.',
  })
  @IsString()
  @IsOptional()
  partner_external_ref?: string;

  @ApiPropertyOptional({
    example: '2025-07-28',
    description:
      'Invoice date (YYYY-MM-DD). Defaults to today if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'invoice_date must be in YYYY-MM-DD format',
  })
  invoice_date?: string;

  @ApiPropertyOptional({
    example: '2025-08-28',
    description: 'Payment due date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'invoice_date_due must be in YYYY-MM-DD format',
  })
  invoice_date_due?: string;

  @ApiProperty({
    description: 'Invoice line items. At least one line is required.',
    type: [UpsertInvoiceLineDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one invoice line is required' })
  @ValidateNested({ each: true })
  @Type(() => UpsertInvoiceLineDto)
  lines: UpsertInvoiceLineDto[];

  @ApiPropertyOptional({
    example: 'USD',
    description:
      'Currency code (e.g. USD, KES, EUR). If omitted, uses the company default currency.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency_code?: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Journal ID (account.journal). If omitted, Odoo selects the default journal for the move_type.',
  })
  @IsNumber()
  @IsOptional()
  journal_id?: number;

  @ApiPropertyOptional({
    example: 'PO-2025-001',
    description: 'Free-text memo field. Typically used for the external system\'s purchase order number, internal notes, or payment instructions. Shown on printed invoices under "Notes".',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  narration?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Automatically confirm/post the invoice after creation. If posting fails (e.g. missing account), the invoice remains in draft and the error is returned in the response.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  auto_post?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'If false, the invoice is archived. Rarely used — prefer cancel/delete for invoices instead of archiving.',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Additional Odoo fields to set on the invoice record. Common fields: `payment_reference` (payment communication), `fiscal_position_id` (tax mapping), `invoice_origin` (source document reference).',
  })
  @IsObject()
  @IsOptional()
  extra_fields?: Record<string, any>;
}
