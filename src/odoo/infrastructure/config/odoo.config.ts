import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ODOO_DEFAULT_TIMEOUT_MS,
  ODOO_DEFAULT_URL,
  ODOO_MODULE_OPTIONS,
  errOdooConfigRequired,
  errOdooUrlInvalid,
} from '../../../common/constants';
import { OdooConnectionOptions } from '../../interfaces/odoo-module-options.interface';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Type-safe configuration for Odoo connection.
 * Explicit module options win over environment variables.
 * Validates required settings at startup.
 */
@Injectable()
export class OdooConfigService {
  private readonly logger = new Logger(OdooConfigService.name);

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional()
    @Inject(ODOO_MODULE_OPTIONS)
    private readonly options: OdooConnectionOptions = {},
  ) {
    this.validate();
  }

  get url(): string {
    return this.options.url ?? this.env('ODOO_URL') ?? ODOO_DEFAULT_URL;
  }

  get database(): string {
    return this.required(this.options.database, 'ODOO_DATABASE');
  }

  get username(): string {
    return this.required(this.options.username, 'ODOO_USERNAME');
  }

  get password(): string {
    return this.required(this.options.password, 'ODOO_PASSWORD');
  }

  get timeoutMs(): number {
    const raw = this.options.timeoutMs ?? this.env('ODOO_TIMEOUT_MS');
    const n = Number(raw);
    return raw != null && Number.isFinite(n) && n > 0
      ? n
      : ODOO_DEFAULT_TIMEOUT_MS;
  }

  private env(key: string): string | undefined {
    return this.configService?.get<string>(key) ?? process.env[key];
  }

  private required(explicit: string | undefined, key: string): string {
    const value = explicit ?? this.env(key);
    if (!value) throw new Error(errOdooConfigRequired(key));
    return value;
  }

  private validate(): void {
    void this.database;
    void this.username;
    void this.password;

    let parsed: URL;
    try {
      parsed = new URL(this.url);
    } catch {
      throw new Error(errOdooUrlInvalid(this.url));
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(errOdooUrlInvalid(this.url));
    }
    if (parsed.protocol === 'http:' && !LOCAL_HOSTS.has(parsed.hostname)) {
      this.logger.warn(
        `ODOO_URL uses plain HTTP (${parsed.host}); Odoo credentials are sent unencrypted. Use HTTPS in production.`,
      );
    }
  }
}
