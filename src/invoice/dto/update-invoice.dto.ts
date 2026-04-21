import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDateString, IsString } from 'class-validator';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ example: 7, description: 'Partner ID' })
  @IsNumber()
  @IsOptional()
  partner_id?: number;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsDateString()
  @IsOptional()
  invoice_date?: string;

  @ApiPropertyOptional({ example: '2025-02-15' })
  @IsDateString()
  @IsOptional()
  invoice_date_due?: string;

  @ApiPropertyOptional({ example: 'Payment terms or notes' })
  @IsString()
  @IsOptional()
  narration?: string;

  @ApiPropertyOptional({ example: 'INV/2025/0001' })
  @IsString()
  @IsOptional()
  ref?: string;
}
