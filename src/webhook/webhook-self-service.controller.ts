import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { WebhookRegistryService } from './services/webhook-registry.service';
import { GetApiKeyContext } from '../auth/decorators';
import { ApiKeyContext } from '../auth/interfaces';

/**
 * Self-service webhook endpoints.
 * Every authenticated API key can view their own webhook registrations
 * and delivery history — scoped automatically by their systemName.
 * No admin scope required.
 */
@ApiTags('Webhooks (Self-Service)')
@ApiSecurity('X-API-Key')
@Controller('webhooks')
export class WebhookSelfServiceController {
  constructor(private readonly registry: WebhookRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List your own webhook registrations' })
  async listOwn(@GetApiKeyContext() ctx: ApiKeyContext) {
    return this.registry.listByService(ctx.systemName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of your webhook registrations' })
  async getOwn(
    @Param('id', ParseUUIDPipe) id: string,
    @GetApiKeyContext() ctx: ApiKeyContext,
  ) {
    return this.registry.getByIdForService(id, ctx.systemName);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for your webhook' })
  async deliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @GetApiKeyContext() ctx: ApiKeyContext,
  ) {
    return this.registry.getDeliveryHistoryForService(
      id,
      ctx.systemName,
      Math.min(limit, 200),
    );
  }
}
