import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errOdooConfigRequired } from '../../../common/constants';

/**
 * Type-safe configuration for Odoo connection
 * Validates required environment variables at startup
 */
@Injectable()
export class OdooConfigService {
  constructor(private configService: ConfigService) {
    this.validate();
  }

  get url(): string {
    return this.configService.get<string>('ODOO_URL', 'http://localhost:8069');
  }

  get database(): string {
    const db = this.configService.get<string>('ODOO_DATABASE');
    if (!db) throw new Error(errOdooConfigRequired('ODOO_DATABASE'));
    return db;
  }

  get username(): string {
    const user = this.configService.get<string>('ODOO_USERNAME');
    if (!user) throw new Error(errOdooConfigRequired('ODOO_USERNAME'));
    return user;
  }

  get password(): string {
    const pass = this.configService.get<string>('ODOO_PASSWORD');
    if (!pass) throw new Error(errOdooConfigRequired('ODOO_PASSWORD'));
    return pass;
  }

  private validate(): void {
    void this.database;
    void this.username;
    void this.password;
  }
}
