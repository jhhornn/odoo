import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export * from './create-invoice.dto';
export * from './update-invoice.dto';

export class InvoiceDto {
  @ApiProperty({ example: 201 })
  id: number;

  @ApiProperty({ example: 'out_invoice', description: 'Invoice type' })
  move_type: 'out_invoice' | 'in_invoice' | 'out_refund' | 'in_refund';

  @ApiProperty({ example: 7, description: 'Partner ID' })
  partner_id: number;

  @ApiPropertyOptional({ example: '2025-07-28' })
  invoice_date?: string;

  @ApiPropertyOptional({ example: 'INV/2025/001' })
  name?: string;

  @ApiPropertyOptional({
    example: [
      [
        0,
        0,
        {
          name: 'Consulting Services',
          quantity: 10,
          price_unit: 150.0,
          product_id: 101,
        },
      ],
    ],
  })
  invoice_line_ids?: any[];
}

export class FilterInvoiceDto {
  @ApiPropertyOptional({ example: 'out_invoice' })
  move_type?: 'out_invoice' | 'in_invoice' | 'out_refund' | 'in_refund';

  @ApiPropertyOptional({ example: 7 })
  partner_id?: number;

  @ApiPropertyOptional({ example: '2025-07-28' })
  invoice_date?: string;

  @ApiPropertyOptional({ example: 50 })
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  offset?: number;

  @ApiPropertyOptional({
    example: ['move_type', 'partner_id', 'invoice_date', 'invoice_line_ids'],
    description: 'Fields to return',
    isArray: true,
    type: String,
  })
  fields?: string[];
}
