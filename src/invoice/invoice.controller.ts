import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { UpdateInvoiceDto, InvoiceDto, FilterInvoiceDto } from './dto';
import { UpsertInvoiceDto } from './dto/upsert-invoice.dto';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';
import { ApiCommonErrorResponses } from '../common/decorators/api-error-responses.decorator';
import { GetApiKeyContext } from '../auth/decorators';
import { ApiKeyContext } from '../auth/interfaces';
import { SearchDomain } from '../odoo/interfaces';

/**
 * REST endpoints for Invoice operations
 */
@ApiTags('Invoices')
@ApiSecurity('X-API-Key')
@ApiCommonErrorResponses()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update an Invoice or Bill',
    description:
      'Creates or updates an invoice/bill in Odoo. Use move_type "out_invoice" for customer invoices ' +
      'and "in_invoice" for vendor bills. Only draft invoices can be updated. Set auto_post=true to confirm.',
  })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'External system API key',
    required: true,
  })
  @ApiBody({ type: UpsertInvoiceDto })
  @ApiStandardResponse({
    status: 200,
    description: 'Invoice created or updated successfully',
  })
  async create(
    @Body() dto: UpsertInvoiceDto,
    @GetApiKeyContext() context: ApiKeyContext,
  ) {
    return this.invoiceService.upsert(dto, context);
  }

  @Get()
  @ApiOperation({
    summary: 'List invoices',
    description: 'Search and filter invoices based on various criteria.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'A list of invoices',
    type: [InvoiceDto],
  })
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
        value: Number(filters.partner_id),
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

  @Get('partner/:partnerId')
  @ApiOperation({ summary: 'Get invoices for specific partner' })
  @ApiParam({ name: 'partnerId', type: Number, description: 'Partner ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Partner invoices' })
  async getPartnerInvoices(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoiceService.findByPartner(partnerId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiStandardResponse({
    status: 200,
    description: 'Invoice details',
    type: InvoiceDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiStandardResponse({
    status: 200,
    description: 'Invoice updated successfully',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(id, updateInvoiceDto as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiStandardResponse({
    status: 200,
    description: 'Invoice deleted successfully',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.delete(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiStandardResponse({ status: 200, description: 'Invoice cancelled' })
  async cancelInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.cancelInvoice(id);
  }

  @Put(':id/reset-draft')
  @ApiOperation({ summary: 'Reset invoice to draft' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiStandardResponse({ status: 200, description: 'Invoice reset to draft' })
  async resetToDraft(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.resetToDraft(id);
  }
}
