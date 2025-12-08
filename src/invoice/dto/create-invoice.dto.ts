import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Invoice data',
    example: {
      move_type: 'out_invoice',
      partner_id: 7,
      invoice_line_ids: [
        [0, 0, {
          name: 'Product or Service',
          quantity: 1,
          price_unit: 100.00,
        }],
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  values: Record<string, any>;
}
