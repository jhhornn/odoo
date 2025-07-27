import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Put,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CreateInvoiceDto } from './dto';
import { OdooService } from './odoo.service';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly odooService: OdooService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new invoice',
    description: 'Create a new customer invoice or vendor bill',
  })
  @ApiBody({
    type: CreateInvoiceDto,
    description: 'Invoice data',
  })
  @ApiResponse({
    status: 201,
    description: 'ID of the created invoice',
    schema: {
      example: 89,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data',
    schema: {
      example: {
        statusCode: 400,
        message: 'Odoo API Error: Invalid partner_id',
      },
    },
  })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    try {
      return await this.odooService.create(
        'account.move',
        createInvoiceDto.values,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('draft')
  @ApiOperation({
    summary: 'Get draft invoices',
    description: 'Retrieve all invoices in draft state',
  })
  @ApiResponse({
    status: 200,
    description: 'List of draft invoices',
    schema: {
      example: [
        {
          id: 89,
          name: 'INV/2025/0001',
          partner_id: [7, 'Azure Interior'],
          amount_total: 1500.0,
          state: 'draft',
        },
      ],
    },
  })
  async getDraftInvoices() {
    return this.odooService.searchRead(
      'account.move',
      [
        { field: 'move_type', operator: '=', value: 'out_invoice' },
        { field: 'state', operator: '=', value: 'draft' },
      ],
      {
        fields: ['name', 'partner_id', 'amount_total', 'state', 'invoice_date'],
        limit: 100,
      },
    );
  }

  @Put(':id/confirm')
  @ApiOperation({
    summary: 'Confirm an invoice',
    description: 'Confirm a draft invoice to post it',
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: 89,
  })
  @ApiResponse({
    status: 200,
    description: 'Success status',
    schema: {
      example: true,
    },
  })
  async confirmInvoice(@Param('id') id: string) {
    const invoiceId = parseInt(id);
    // This calls the action_post method to confirm the invoice
    return this.odooService.executeKw('account.move', 'action_post', [
      [invoiceId],
    ]);
  }
}
