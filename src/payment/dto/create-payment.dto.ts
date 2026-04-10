import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsEnum,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'EXT-PAY-001',
    description: 'Unique payment identifier from your external system. Used for idempotency — if a payment with this ref already exists, the existing record is returned without creating a duplicate. Stored as `ref` in Odoo.',
  })
  @IsString()
  @IsNotEmpty({ message: 'external_ref is required' })
  @MaxLength(255)
  external_ref: string;

  @ApiPropertyOptional({ example: 201, description: 'Odoo invoice ID (account.move) this payment applies to. The invoice must be in "posted" state. Provide either this or invoice_external_ref — not both.' })
  @IsNumber()
  @IsOptional()
  invoice_id?: number;

  @ApiPropertyOptional({
    example: 'EXT-INV-001',
    description: 'External invoice reference. The API looks up the invoice by `ref` field in Odoo. Use this instead of invoice_id when you only know the external ref.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  invoice_external_ref?: string;

  @ApiProperty({ example: 5000.0, description: 'Payment amount in the invoice currency. Can be less than the invoice total for partial payments. Must be greater than zero.' })
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0.01, { message: 'Payment amount must be greater than zero' })
  amount: number;

  @ApiPropertyOptional({
    example: '2025-07-30',
    description: 'Payment date (YYYY-MM-DD). Defaults to today if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'payment_date must be in YYYY-MM-DD format',
  })
  payment_date?: string;

  @ApiPropertyOptional({
    example: 'inbound',
    enum: ['inbound', 'outbound'],
    description: 'Payment type: inbound (receipt from customer) or outbound (payment to vendor). Auto-detected from invoice type if omitted.',
  })
  @IsEnum(['inbound', 'outbound'], {
    message: 'payment_type must be one of: inbound, outbound',
  })
  @IsOptional()
  payment_type?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Payment journal ID (account.journal). Determines the bank/cash account used. If omitted, Odoo uses the default payment journal. Common journals: Bank, Cash, M-Pesa.',
  })
  @IsNumber()
  @IsOptional()
  journal_id?: number;

  @ApiPropertyOptional({
    example: 'customer',
    enum: ['customer', 'supplier'],
    description: 'Partner type. Auto-detected from invoice type if omitted.',
  })
  @IsEnum(['customer', 'supplier'], {
    message: 'partner_type must be one of: customer, supplier',
  })
  @IsOptional()
  partner_type?: string;

  @ApiPropertyOptional({
    example: 'MPESA-REF-123',
    description: 'Transaction reference or memo (e.g. M-Pesa confirmation code, bank transfer reference, cheque number). Shown on payment receipts and bank reconciliation.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  ref?: string;

  @ApiPropertyOptional({ description: 'Additional Odoo fields to set on the payment record. Common fields: `payment_method_id` (payment method), `writeoff_account_id` (write-off account for partial reconciliation).' })
  @IsObject()
  @IsOptional()
  extra_fields?: Record<string, any>;
}
