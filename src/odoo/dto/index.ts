import { ApiProperty } from '@nestjs/swagger';
import { SearchDomain } from '../interfaces';

export class SearchDomainDto {
  @ApiProperty({ example: 'name', description: 'Field name to search on' })
  field: string;

  @ApiProperty({
    example: '=',
    enum: ['=', '!=', '>', '<', '>=', '<=', 'like', 'ilike', 'in', 'not in'],
    description: 'Search operator',
  })
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'like'
    | 'ilike'
    | 'in'
    | 'not in';

  @ApiProperty({
    example: 'Azure Interior',
    description: 'Value to search for',
  })
  value: any;
}

export class SearchDto {
  @ApiProperty({
    type: [SearchDomainDto],
    required: false,
    description: 'Search domain filters',
    example: [{ field: 'is_company', operator: '=', value: true }],
  })
  domain?: SearchDomain[];

  @ApiProperty({
    required: false,
    example: 10,
    description: 'Maximum number of records to return',
  })
  limit?: number;

  @ApiProperty({
    required: false,
    example: 0,
    description: 'Number of records to skip',
  })
  offset?: number;

  @ApiProperty({
    required: false,
    example: 'name ASC',
    description: 'Sort order (field ASC/DESC)',
  })
  order?: string;
}

export class SearchReadDto extends SearchDto {
  @ApiProperty({
    type: [String],
    required: false,
    example: ['name', 'email', 'phone'],
    description: 'Fields to retrieve',
  })
  fields?: string[];
}

export class CreateRecordDto {
  @ApiProperty({
    example: {
      name: 'New Partner',
      email: 'partner@example.com',
      is_company: true,
    },
    description: 'Field values for the new record',
  })
  values: Record<string, any>;
}

export class UpdateRecordDto {
  @ApiProperty({
    example: { name: 'Updated Partner', phone: '+1-555-0123' },
    description: 'Field values to update',
  })
  values: Record<string, any>;
}

export class CreateInvoiceDto {
  @ApiProperty({
    example: {
      move_type: 'out_invoice',
      partner_id: 7,
      invoice_date: '2025-07-28',
      invoice_line_ids: [
        [
          0,
          0,
          {
            name: 'Consulting Services',
            quantity: 10,
            price_unit: 150.0,
          },
        ],
      ],
    },
    description: 'Invoice data',
  })
  values: {
    move_type: 'out_invoice' | 'in_invoice' | 'out_refund' | 'in_refund';
    partner_id: number;
    invoice_date?: string;
    payment_reference?: string;
    invoice_line_ids: any[];
  };
}

export class OdooModelDto {
  @ApiProperty({
    description: 'Technical model identifier used in Odoo',
    example: 'account_followup.followup.line',
  })
  model: string;

  @ApiProperty({
    description: 'Human-readable name or description of the model',
    example: 'Follow-up Criteria',
  })
  name: string;
}

// grouped-models-response.dto.ts
export type GroupedModelsResponseDto = Record<string, Record<string, string>>;
