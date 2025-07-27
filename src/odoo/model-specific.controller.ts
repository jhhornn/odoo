import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { OdooService } from './odoo.service';

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly odooService: OdooService) {}

  @Get('companies')
  @ApiOperation({
    summary: 'Get all company partners',
    description: 'Retrieve all partners marked as companies',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of company partners',
    schema: {
      example: [
        {
          id: 7,
          name: 'Azure Interior',
          email: 'azure@example.com',
          phone: '+1-555-0123',
          country_id: [233, 'United States'],
        },
      ],
    },
  })
  async getCompanies(@Query('limit') limit?: number) {
    return this.odooService.searchRead(
      'res.partner',
      [{ field: 'is_company', operator: '=', value: true }],
      {
        fields: ['name', 'email', 'phone', 'country_id'],
        limit: limit || 50,
      },
    );
  }

  @Get('customers')
  @ApiOperation({
    summary: 'Get customer partners',
    description: 'Retrieve all partners marked as customers',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of customer partners',
    schema: {
      example: [
        {
          id: 14,
          name: 'Deco Addict',
          email: 'deco@example.com',
          phone: '+1-555-0456',
          customer_rank: 1,
        },
      ],
    },
  })
  async getCustomers(@Query('limit') limit?: number) {
    return this.odooService.searchRead(
      'res.partner',
      [{ field: 'customer_rank', operator: '>', value: 0 }],
      {
        fields: ['name', 'email', 'phone', 'customer_rank'],
        limit: limit || 50,
      },
    );
  }
}
