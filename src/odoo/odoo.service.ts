import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XmlRpcClientFactory } from './factories/xml-rpc-client.factory';
import { IOdooClient } from './interfaces/odoo-client.interface';
import {
  OdooConfig,
  SearchDomain,
  SearchOptions,
  ReadOptions,
} from './interfaces';

@Injectable()
export class OdooService {
  private commonClient: IOdooClient;
  private objectClient: IOdooClient;
  private config: OdooConfig;
  private uid: number | null = null;

  constructor(
    private configService: ConfigService,
    private clientFactory: XmlRpcClientFactory,
  ) {
    this.config = {
      url:
        this.configService.get<string>('ODOO_URL') || 'http://localhost:8069',
      database: this.configService.get<string>('ODOO_DATABASE') || 'odoo',
      username: this.configService.get<string>('ODOO_USERNAME') || 'admin',
      password: this.configService.get<string>('ODOO_PASSWORD') || 'admin',
    };

    this.commonClient = this.clientFactory.createClient(
      this.config.url,
      '/xmlrpc/2/common',
    );
    this.objectClient = this.clientFactory.createClient(
      this.config.url,
      '/xmlrpc/2/object',
    );
  }

  private async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    return new Promise((resolve, reject) => {
      this.commonClient
        .methodCall('authenticate', [
          this.config.database,
          this.config.username,
          this.config.password,
          {},
        ])
        .then((value: number) => {
          if (!value) {
            reject(
              new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
            );
          } else {
            this.uid = value;
            resolve(value);
          }
        })
        .catch(() => {
          reject(
            new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED),
          );
        });
    });
  }

  async executeKw(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: any = {},
  ): Promise<any> {
    const uid = await this.authenticate();

    try {
      return await this.objectClient.methodCall('execute_kw', [
        this.config.database,
        uid,
        this.config.password,
        model,
        method,
        args,
        kwargs,
      ]);
    } catch (error: any) {
      throw new HttpException(
        `Odoo API Error: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
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

  private readonly MODEL_PREFIX_MAP: Record<string, string> = {
    'res.': 'Core Models',
    'sale.': 'Sales',
    'account.': 'Accounting',
    'stock.': 'Inventory',
    'purchase.': 'Purchase',
    'crm.': 'CRM',
    'hr.': 'HR',
  };

  private getCategoryFromModel(model: string): string {
    const entry = Object.entries(this.MODEL_PREFIX_MAP).find(([prefix]) =>
      model.startsWith(prefix),
    );
    return entry ? entry[1] : 'Other';
  }

  async getModels(): Promise<Record<string, Record<string, string>>> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      this.objectClient
        .methodCall('execute_kw', [
          this.config.database,
          uid,
          this.config.password,
          'ir.model',
          'search_read',
          [[]],
          { fields: ['model', 'name'], limit: 1000 },
        ])
        .then((models: any[]) => {
          const grouped: Record<string, Record<string, string>> = {};

          models.forEach((item) => {
            const category = this.getCategoryFromModel(item.model);
            if (!grouped[category]) {
              grouped[category] = {};
            }
            grouped[category][item.model] = item.name;
          });

          resolve(grouped);
        })
        .catch((error) => {
          reject(
            new HttpException(
              `Odoo API Error: ${error.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        });
    });
  }

  // Get detailed model information
  async getModelInfo(model?: string): Promise<any> {
    const uid = await this.authenticate();
    const domain = model ? [['model', '=', model]] : [];

    return new Promise((resolve, reject) => {
      this.objectClient
        .methodCall('execute_kw', [
          this.config.database,
          uid,
          this.config.password,
          'ir.model',
          'search_read',
          [domain],
          {
            fields: ['model', 'name', 'info', 'state', 'transient'],
            order: 'model ASC',
          },
        ])
        .then((value: any) => {
          resolve(value);
        })
        .catch((error: any) => {
          reject(
            new HttpException(
              `Odoo API Error: ${error.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        });
    });
  }

  // Get installed modules/apps
  async getInstalledModules(): Promise<any[]> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      this.commonClient
        .methodCall('execute_kw', [
          this.config.database,
          uid,
          this.config.password,
          'ir.module.module',
          'search_read',
          [[['state', '=', 'installed']]],
          {
            fields: ['name', 'shortdesc', 'summary', 'category_id', 'version'],
            order: 'category_id, name ASC',
          },
        ])
        .then((value: any) => {
          resolve(value);
        })
        .catch((error: any) => {
          reject(
            new HttpException(
              `Odoo API Error: ${error.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        });
    });
  }

  // Get models by module/app
  async getModelsByModule(moduleName: string): Promise<any[]> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      this.commonClient
        .methodCall('execute_kw', [
          this.config.database,
          uid,
          this.config.password,
          'ir.model',
          'search_read',
          [[['modules', 'ilike', moduleName]]],
          {
            fields: ['model', 'name', 'info'],
            order: 'model ASC',
          },
        ])
        .then((value: any) => {
          resolve(value);
        })
        .catch((error: any) => {
          reject(
            new HttpException(
              `Odoo API Error: ${error.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        });
    });
  }

  // Get field details for a model
  async getModelFieldsDetailed(model: string): Promise<any> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      this.commonClient
        .methodCall('execute_kw', [
          this.config.database,
          uid,
          this.config.password,
          'ir.model.fields',
          'search_read',
          [[['model', '=', model]]],
          {
            fields: [
              'name',
              'field_description',
              'ttype',
              'required',
              'readonly',
              'help',
              'relation',
              'selection',
            ],
            order: 'name ASC',
          },
        ])
        .then((value: any) => {
          resolve(value);
        })
        .catch((error: any) => {
          reject(
            new HttpException(
              `Odoo API Error: ${error.message}`,
              HttpStatus.BAD_REQUEST,
            ),
          );
        });
    });
  }
}
