import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsArray,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SearchDomain } from '../interfaces';

const SEARCH_OPERATORS = [
  '=',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'like',
  'ilike',
  'in',
  'not in',
] as const;

export class SearchDomainDto {
  @ApiProperty({ example: 'name', description: 'Field name to search on' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  field: string;

  @ApiProperty({
    example: '=',
    enum: SEARCH_OPERATORS,
    description: 'Search operator',
  })
  @IsIn(SEARCH_OPERATORS)
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
  @IsNotEmpty()
  value: any;
}

export class SearchDto {
  @ApiProperty({
    type: [SearchDomainDto],
    required: false,
    description: 'Search domain filters',
    example: [{ field: 'is_company', operator: '=', value: true }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchDomainDto)
  domain?: SearchDomain[];

  @ApiProperty({
    required: false,
    example: 10,
    description: 'Maximum number of records to return',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    required: false,
    example: 0,
    description: 'Number of records to skip',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiProperty({
    required: false,
    example: 'name ASC',
    description: 'Sort order (field ASC/DESC)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  order?: string;
}

export class SearchReadDto extends SearchDto {
  @ApiProperty({
    type: [String],
    required: false,
    example: ['name', 'email', 'phone'],
    description: 'Fields to retrieve',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
  @IsObject()
  @IsNotEmpty()
  values: Record<string, any>;
}

export class UpdateRecordDto {
  @ApiProperty({
    example: { name: 'Updated Partner', phone: '+1-555-0123' },
    description: 'Field values to update',
  })
  @IsObject()
  @IsNotEmpty()
  values: Record<string, any>;
}

export class OdooModelDto {
  @ApiProperty({
    description: 'Technical model identifier used in Odoo',
    example: 'account_followup.followup.line',
  })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({
    description: 'Human-readable name or description of the model',
    example: 'Follow-up Criteria',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

// grouped-models-response.dto.ts
export type GroupedModelsResponseDto = Record<string, Record<string, string>>;
