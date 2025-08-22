import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PartnerService } from './partner.service';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  FilterPartnerDto,
  PartnerDto,
} from './dtos';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SearchDomain } from '../odoo/interfaces';

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({
    status: 201,
    description: 'The ID of the newly created partner.',
    schema: { example: 123 },
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiBody({ type: CreatePartnerDto })
  async create(@Body() createPartnerDto: CreatePartnerDto): Promise<number> {
    return this.partnerService.createPartner(createPartnerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Find partners',
    description: 'Search and filter partners based on various criteria.',
  })
  @ApiResponse({
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a partner by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the partner', example: 7 })
  @ApiResponse({
    status: 200,
    description: 'The partner record.',
    type: PartnerDto,
  })
  @ApiResponse({ status: 404, description: 'Partner not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    const partner = await this.partnerService.findOne(id);
    if (!partner) {
      throw new BadRequestException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a partner' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the partner to update',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Update successful.',
    schema: { example: true },
  })
  @ApiResponse({ status: 404, description: 'Partner not found.' })
  @ApiBody({ type: UpdatePartnerDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ): Promise<boolean> {
    return this.partnerService.updatePartner(id, updatePartnerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a partner' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the partner to delete',
    example: 7,
  })
  @ApiResponse({ status: 204, description: 'Partner successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Partner not found.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.partnerService.deletePartner(id);
  }
}
