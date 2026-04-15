import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Logger,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookRegistryService } from './services/webhook-registry.service';
import { RegisterWebhookDto, UpdateWebhookDto } from './dto';
import { ScopeGuard } from '../auth/guards';
import { RequireScopes } from '../auth/decorators';

@ApiTags('Webhooks')
@ApiBearerAuth()
@RequireScopes('admin')
@UseGuards(ScopeGuard)
@Controller('admin/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly registry: WebhookRegistryService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  async register(@Body() dto: RegisterWebhookDto) {
    return this.registry.register(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook registrations' })
  async list() {
    return this.registry.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook registration by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.registry.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook registration' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.registry.update(id, dto);
  }

  @Post(':id/rotate-secret')
  @ApiOperation({ summary: 'Rotate the signing secret for a webhook' })
  async rotateSecret(@Param('id', ParseUUIDPipe) id: string) {
    return this.registry.rotateSecret(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disable a webhook registration' })
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    await this.registry.disable(id);
    return { message: 'Webhook registration disabled' };
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for a webhook registration' })
  async deliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.registry.getDeliveryHistory(id, Math.min(limit, 200));
  }
}
