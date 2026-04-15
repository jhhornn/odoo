import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class UpdateProductDto {
  @ApiProperty({
    description: 'Product fields to update',
    example: {
      list_price: 34.99,
      qty_available: 100,
    },
  })
  @IsObject()
  @IsNotEmpty()
  values: Record<string, any>;
}
