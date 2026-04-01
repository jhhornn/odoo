import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  FilterInvoiceDto,
  InvoiceDto,
} from './dtos';
import { SearchDomain } from 'src/odoo/interfaces';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create an invoice' })
  @ApiResponse({
    status: 201,
    description: 'Invoice created',
    schema: { example: 201 },
  })
  @ApiBody({ type: CreateInvoiceDto })
  async create(@Body() dto: CreateInvoiceDto): Promise<number> {
    return this.invoiceService.createInvoice(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, type: [InvoiceDto] })
  async findAll(@Query() filters: FilterInvoiceDto) {
    const domain: SearchDomain[] = [];
    if (filters.move_type) {
      domain.push({
        field: 'move_type',
        operator: '=',
        value: filters.move_type,
      });
    }
    if (filters.partner_id) {
      domain.push({
        field: 'partner_id',
        operator: '=',
        value: filters.partner_id,
      });
    }
    if (filters.invoice_date) {
      domain.push({
        field: 'invoice_date',
        operator: '=',
        value: filters.invoice_date,
      });
    }

    return this.invoiceService.searchRead(domain, {
      fields: filters.fields,
      limit: filters.limit ? Number(filters.limit) : 50,
      offset: filters.offset ? Number(filters.offset) : 0,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({ name: 'id', example: 201 })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoiceService.findOne(id);
    if (!invoice) {
      throw new BadRequestException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.updateInvoice(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.invoiceService.deleteInvoice(id);
  }
}
