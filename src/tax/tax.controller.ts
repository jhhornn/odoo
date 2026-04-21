import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { FilterTaxDto, TaxDto } from './dto';
import { SearchDomain } from '../odoo/interfaces';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';
import { ApiCommonErrorResponses } from '../common/decorators/api-error-responses.decorator';

@ApiTags('Taxes')
@ApiSecurity('X-API-Key')
@ApiCommonErrorResponses()
@Controller('taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  @ApiOperation({
    summary: 'List taxes',
    description:
      'Search and filter taxes. Use type_tax_use=sale for customer invoice taxes, type_tax_use=purchase for vendor bill taxes.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'A list of taxes',
    type: [TaxDto],
  })
  async findAll(@Query() filters: FilterTaxDto) {
    const domain: SearchDomain[] = [];

    if (filters.type_tax_use) {
      domain.push({
        field: 'type_tax_use',
        operator: '=',
        value: filters.type_tax_use,
      });
    }

    if (filters.name) {
      domain.push({ field: 'name', operator: 'ilike', value: filters.name });
    }

    const active = filters.active !== undefined ? filters.active : true;
    domain.push({ field: 'active', operator: '=', value: active });

    return this.taxService.searchRead(domain, {
      fields: filters.fields,
      limit: filters.limit ? Number(filters.limit) : 50,
      offset: filters.offset ? Number(filters.offset) : 0,
      order: 'sequence asc',
    });
  }

  @Get('sale')
  @ApiOperation({
    summary: 'List sale taxes',
    description:
      'Returns active taxes applicable to customer invoices (out_invoice). Use these IDs in invoice line tax_ids.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Sale taxes',
    type: [TaxDto],
  })
  async findSaleTaxes() {
    return this.taxService.findSaleTaxes();
  }

  @Get('purchase')
  @ApiOperation({
    summary: 'List purchase taxes',
    description:
      'Returns active taxes applicable to vendor bills (in_invoice). Use these IDs in invoice line tax_ids.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Purchase taxes',
    type: [TaxDto],
  })
  async findPurchaseTaxes() {
    return this.taxService.findPurchaseTaxes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Tax ID' })
  @ApiStandardResponse({
    status: 200,
    description: 'Tax details',
    type: TaxDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taxService.findTaxById(id);
  }
}
