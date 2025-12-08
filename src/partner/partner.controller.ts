import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { SearchDomain } from 'src/odoo/interfaces';
import {
  PartnerDto,
  FilterPartnerDto,
  CreatePartnerDto,
  UpdatePartnerDto,
} from './dto';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';

/**
 * REST endpoints for Partner operations
 */
@ApiTags('Partners')
@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiBody({ type: CreatePartnerDto })
  @ApiStandardResponse({ status: 201, description: 'Partner created successfully' })
  async create(@Body() createPartnerDto: CreatePartnerDto) {
    return this.partnerService.create(createPartnerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Find partners',
    description: 'Search and filter partners based on various criteria.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'A list of partners.',
    type: [PartnerDto],
  })
  async findAll(@Query() filters: FilterPartnerDto): Promise<any[]> {
    const domain: SearchDomain[] = [];
    if (filters.name) {
      domain.push({ field: 'name', operator: 'ilike', value: filters.name });
    }
    if (filters.email) {
      domain.push({ field: 'email', operator: '=', value: filters.email });
    }
    if (filters.is_company !== undefined) {
      domain.push({
        field: 'is_company',
        operator: '=',
        value: filters.is_company,
      });
    }
    if (filters.customer_rank_gt) {
      domain.push({ field: 'customer_rank', operator: '>', value: 0 });
    }
    if (filters.supplier_rank_gt) {
      domain.push({ field: 'supplier_rank', operator: '>', value: 0 });
    }

    return this.partnerService.searchRead(domain, {
      fields: filters.fields,
      limit: filters.limit ? Number(filters.limit) : 50,
      offset: filters.offset ? Number(filters.offset) : 0,
    });
  }

  @Get('companies')
  @ApiOperation({ summary: 'List all company partners' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'List of companies' })
  async getCompanies(@Query('limit') limit?: number) {
    return this.partnerService.findCompanies(limit);
  }

  @Get('customers')
  @ApiOperation({ summary: 'List all customer partners' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'List of customers' })
  async getCustomers(@Query('limit') limit?: number) {
    return this.partnerService.findCustomers(limit);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'List all supplier partners' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'List of suppliers' })
  async getSuppliers(@Query('limit') limit?: number) {
    return this.partnerService.findSuppliers(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search partners by name or email' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Search results' })
  async searchPartners(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.partnerService.searchByNameOrEmail(query, limit);
  }

  @Get('country/:countryId')
  @ApiOperation({ summary: 'Find partners by country' })
  @ApiParam({ name: 'countryId', type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Partners in country' })
  async getByCountry(
    @Param('countryId', ParseIntPipe) countryId: number,
    @Query('limit') limit?: number,
  ) {
    return this.partnerService.findByCountry(countryId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiStandardResponse({ status: 200, description: 'Partner details', type: PartnerDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partnerService.findOne(id, [
      'name',
      'email',
      'phone',
      'mobile',
      'website',
      'street',
      'city',
      'state_id',
      'country_id',
      'zip',
      'is_company',
      'vat',
      'customer_rank',
      'supplier_rank',
    ]);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update partner' })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiBody({ type: UpdatePartnerDto })
  @ApiStandardResponse({ status: 200, description: 'Partner updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnerService.update(id, updatePartnerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the partner to delete',
    example: 7,
  })
  @ApiStandardResponse({ status: 204, description: 'Partner successfully deleted.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.partnerService.deletePartner(id);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a partner (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiStandardResponse({ status: 200, description: 'Partner archived' })
  async archivePartner(@Param('id', ParseIntPipe) id: number) {
    return this.partnerService.archivePartner(id);
  }

  @Put(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a partner' })
  @ApiParam({ name: 'id', type: Number })
  @ApiStandardResponse({ status: 200, description: 'Partner unarchived' })
  async unarchivePartner(@Param('id', ParseIntPipe) id: number) {
    return this.partnerService.unarchivePartner(id);
  }
}
