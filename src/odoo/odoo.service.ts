import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xmlrpc from 'xmlrpc';
import {
  OdooConfig,
  SearchDomain,
  SearchOptions,
  ReadOptions,
} from './interfaces';

@Injectable()
export class OdooService {
  private commonClient: any;
  private objectClient: any;
  private config: OdooConfig;
  private uid: number | null = null;

  constructor(private configService: ConfigService) {
    this.config = {
      url:
        this.configService.get<string>('ODOO_URL') || 'http://localhost:8069',
      database: this.configService.get<string>('ODOO_DATABASE') || 'odoo',
      username: this.configService.get<string>('ODOO_USERNAME') || 'admin',
      password: this.configService.get<string>('ODOO_PASSWORD') || 'admin',
    };

    const parsedUrl = new URL(this.config.url);
    const isHttps = parsedUrl.protocol === 'https:';
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : isHttps ? 443 : 80;

    this.commonClient = isHttps
      ? xmlrpc.createSecureClient({
          host: parsedUrl.hostname,
          port: port,
          path: '/xmlrpc/2/common',
        })
      : xmlrpc.createClient({
          host: parsedUrl.hostname,
          port: port,
          path: '/xmlrpc/2/common',
        });

    this.objectClient = isHttps
      ? xmlrpc.createSecureClient({
          host: parsedUrl.hostname,
          port: port,
          path: '/xmlrpc/2/object',
        })
      : xmlrpc.createClient({
          host: parsedUrl.hostname,
          port: port,
          path: '/xmlrpc/2/object',
        });
  }

  private async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    return new Promise((resolve, reject) => {
      this.commonClient.methodCall(
        'authenticate',
        [this.config.database, this.config.username, this.config.password, {}],
        (error: any, value: number) => {
          if (error) {
            reject(
              new HttpException(
                'Authentication failed',
                HttpStatus.UNAUTHORIZED,
              ),
            );
          } else if (!value) {
            reject(
              new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
            );
          } else {
            this.uid = value;
            resolve(value);
          }
        },
      );
    });
  }

  async executeKw(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: any = {},
  ): Promise<any> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      this.objectClient.methodCall(
        'execute_kw',
        [
          this.config.database,
          uid,
          this.config.password,
          model,
          method,
          args,
          kwargs,
        ],
        (error: any, value: any) => {
          if (error) {
            reject(
              new HttpException(
                `Odoo API Error: ${error.message}`,
                HttpStatus.BAD_REQUEST,
              ),
            );
          } else {
            resolve(value);
          }
        },
      );
    });
  }

  // Search for records
  async search(
    model: string,
    domain: SearchDomain[] = [],
    options: SearchOptions = {},
  ): Promise<number[]> {
    const searchDomain = domain.map((d) => [d.field, d.operator, d.value]);
    return this.executeKw(model, 'search', [searchDomain], options);
  }

  // Read records by IDs
  async read(
    model: string,
    ids: number[],
    options: ReadOptions = {},
  ): Promise<any[]> {
    return this.executeKw(model, 'read', [ids], options);
  }

  // Search and read in one call
  async searchRead(
    model: string,
    domain: SearchDomain[] = [],
    options: SearchOptions & ReadOptions = {},
  ): Promise<any[]> {
    const searchDomain = domain.map((d) => [d.field, d.operator, d.value]);
    return this.executeKw(model, 'search_read', [searchDomain], options);
  }

  // Create a new record
  async create(model: string, values: Record<string, any>): Promise<number> {
    return this.executeKw(model, 'create', [values]);
  }

  // Update existing records
  async write(
    model: string,
    ids: number[],
    values: Record<string, any>,
  ): Promise<boolean> {
    return this.executeKw(model, 'write', [ids, values]);
  }

  // Delete records
  async unlink(model: string, ids: number[]): Promise<boolean> {
    return this.executeKw(model, 'unlink', [ids]);
  }

  // Get model fields information
  async fieldsGet(
    model: string,
    attributes: string[] = ['string', 'help', 'type'],
  ): Promise<any> {
    return this.executeKw(model, 'fields_get', [], { attributes });
  }

  // Search by name
  async nameSearch(
    model: string,
    name: string = '',
    options: SearchOptions = {},
  ): Promise<any[]> {
    return this.executeKw(model, 'name_search', [name], options);
  }

  // Count records
  async searchCount(
    model: string,
    domain: SearchDomain[] = [],
  ): Promise<number> {
    const searchDomain = domain.map((d) => [d.field, d.operator, d.value]);
    return this.executeKw(model, 'search_count', [searchDomain]);
  }
}
