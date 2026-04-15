import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyDto } from '../dto';
import { ScopeGuard } from '../guards';
import { RequireScopes } from '../decorators';

@RequireScopes('admin')
@UseGuards(ScopeGuard)
@Controller('admin/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.create({
      systemName: dto.systemName,
      scopes: dto.scopes,
      rateLimitTier: dto.rateLimitTier,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get()
  async list() {
    return this.apiKeyService.list();
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(@Param('id') id: string) {
    await this.apiKeyService.revoke(id);
  }
}
