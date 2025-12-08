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
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';

/**
 * REST endpoints for Invoice operations
 */
@ApiTags('Invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiStandardResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto as any);
  }

  // ... (lines 44-121 skipped)

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiStandardResponse({ status: 200, description: 'Invoice updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(id, updateInvoiceDto as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiParam({ name: 'id', type: Number, description: 'Invoice ID' })
  @ApiStandardResponse({ status: 200, description: 'Invoice deleted successfully' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.delete(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiParam({ name: 'id', type: Number })
  @ApiStandardResponse({ status: 200, description: 'Invoice cancelled' })
  async cancelInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.cancelInvoice(id);
  }

  @Put(':id/reset-draft')
  @ApiOperation({ summary: 'Reset invoice to draft' })
  @ApiParam({ name: 'id', type: Number })
  @ApiStandardResponse({ status: 200, description: 'Invoice reset to draft' })
  async resetToDraft(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.resetToDraft(id);
  }

  @Get('partner/:partnerId')
  @ApiOperation({ summary: 'Get invoices for specific partner' })
  @ApiParam({ name: 'partnerId', type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Partner invoices' })
  async getPartnerInvoices(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoiceService.findByPartner(partnerId, limit);
  }
}
