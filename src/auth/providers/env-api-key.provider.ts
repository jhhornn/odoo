import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IApiKeyProvider, ApiKeyContext } from '../interfaces';

/**
 * Environment-variable-backed API key provider.
 *
 * Supports multiple calling services via prefixed env vars.
 * List service names in SYNC_SERVICES (comma-separated), then define
 * per-service vars: {PREFIX}_API_KEY, {PREFIX}_COMPANY_ID,
 * {PREFIX}_WEBHOOK_URL, {PREFIX}_WEBHOOK_TOKEN.
 *
 * See .env.example for configuration details.
 */
@Injectable()
export class EnvApiKeyProvider implements IApiKeyProvider {
  private readonly logger = new Logger(EnvApiKeyProvider.name);
  private readonly keyMap = new Map<string, ApiKeyContext>();

  constructor(private readonly configService: ConfigService) {
    this.loadKeys();
  }

  private loadKeys(): void {
    const services = this.configService.get<string>('SYNC_SERVICES', '');
    if (!services) {
      this.logger.warn(
        'No SYNC_SERVICES configured — all requests will be rejected',
      );
      return;
    }

    for (const raw of services.split(',')) {
      const name = raw.trim();
      if (!name) continue;

      const prefix = name.toUpperCase();
      const apiKey = this.configService.get<string>(`${prefix}_API_KEY`);
      if (!apiKey) {
        this.logger.warn(
          `${prefix}_API_KEY not set — skipping service "${name}"`,
        );
        continue;
      }

      this.keyMap.set(apiKey, {
        companyId: parseInt(
          this.configService.get<string>(`${prefix}_COMPANY_ID`, '1'),
          10,
        ),
        systemName: name,
        webhookUrl: this.configService.get<string>(`${prefix}_WEBHOOK_URL`),
        webhookToken: this.configService.get<string>(`${prefix}_WEBHOOK_TOKEN`),
      });

      this.logger.log(`Loaded API key for service "${name}"`);
    }
  }

  async validate(apiKey: string): Promise<ApiKeyContext | null> {
    return this.keyMap.get(apiKey) ?? null;
  }
}
