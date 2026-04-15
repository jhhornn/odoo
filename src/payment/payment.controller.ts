import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';
import { ApiCommonErrorResponses } from '../common/decorators/api-error-responses.decorator';
import { GetApiKeyContext } from '../auth/decorators';
import { ApiKeyContext } from '../auth/interfaces';

@ApiTags('Payments')
@ApiSecurity('X-API-Key')
@ApiCommonErrorResponses()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a payment for an invoice',
    description:
      'Creates a payment in Odoo and associates it with the specified invoice. ' +
      'Idempotent — if a payment with the same external_ref already exists, returns the existing record.',
  })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'External system API key',
    required: true,
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiStandardResponse({
    status: 201,
    description: 'Payment registered successfully',
  })
  async create(
    @Body() dto: CreatePaymentDto,
    @GetApiKeyContext() context: ApiKeyContext,
  ) {
    return this.paymentService.createPayment(dto, context);
  }
}
