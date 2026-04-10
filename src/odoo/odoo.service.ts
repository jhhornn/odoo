import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { XmlRpcClientFactory } from './factories/xml-rpc-client.factory';
import { IOdooClient } from './interfaces/odoo-client.interface';
import {
  OdooException,
  OdooErrorCode,
} from './infrastructure/exceptions/odoo.exception';
import { SearchDomain, SearchOptions, ReadOptions } from './interfaces';
import { OdooConfigService } from './infrastructure/config/odoo.config';

/**
 * Core service for Odoo XML-RPC communication
 * Provides high-level abstraction over XML-RPC protocol
 *
 * @remarks
 * This service handles authentication, caching, and all CRUD operations
 * against the Odoo ERP system via XML-RPC.
 *
 * @example
 * ```typescript
 * const partners = await odooService.searchRead(
 *   'res.partner',
 *   [{ field: 'is_company', operator: '=', value: true }],
 *   { fields: ['name', 'email'], limit: 10 }
 * );
 * ```
 *
 * @public
 */
@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);
  private commonClient: IOdooClient;
  private objectClient: IOdooClient;
  private uid: number | null = null;

  constructor(
    private config: OdooConfigService,
    private clientFactory: XmlRpcClientFactory,
  ) {
    this.initializeClients();
  }

  private initializeClients(): void {
    this.commonClient = this.clientFactory.createClient(
      this.config.url,
      '/xmlrpc/2/common',
    );
    this.objectClient = this.clientFactory.createClient(
      this.config.url,
      '/xmlrpc/2/object',
    );
    this.logger.log(`Connected to Odoo at ${this.config.url}`);
  }

  /**
   * Authenticate with Odoo and cache user ID
   * @private
   * @returns User ID
   * @throws {OdooException} When authentication fails
   */
  private async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    try {
      const uid = await this.commonClient.methodCall('authenticate', [
        this.config.database,
        this.config.username,
        this.config.password,
        {},
      ]);

      if (!uid) {
        throw new OdooException(
          OdooErrorCode.INVALID_CREDENTIALS,
          'Authentication failed - check credentials',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.uid = uid;
      this.logger.log(`Authenticated successfully (UID: ${uid})`);
      return uid;
    } catch (error: any) {
      this.logger.error(`Auth error: ${error.message}`);
      throw new OdooException(
        OdooErrorCode.AUTHENTICATION_FAILED,
        error.message,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Execute arbitrary Odoo RPC method
   *
   * @param model - Odoo model name (e.g., 'res.partner', 'account.move')
   * @param method - Method name (e.g., 'search', 'read', 'create')
   * @param args - Positional arguments array
   * @param kwargs - Named arguments object
   * @returns Method execution result
   * @throws {OdooException} When RPC call fails
   *
   * @example
   * ```typescript
   * const result = await odooService.executeKw(
   *   'account.move',
   *   'action_post',
   *   [[invoiceId]]
   * );
   * ```
   */
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
      // Odoo actions (action_post, button_cancel, etc.) return None,
      // which XML-RPC can't serialize. This is a successful operation.
      if (error.message?.includes('cannot marshal None')) {
        this.logger.debug(`RPC [${model}.${method}]: action returned None (success)`);
        return null;
      }
      this.logger.error(`RPC Error [${model}.${method}]: ${error.message}`);
      throw new OdooException(
        OdooErrorCode.API_ERROR,
        `${model}.${method} failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Search for record IDs matching domain criteria
   *
   * @param model - Odoo model name
   * @param domain - Search criteria array
   * @param options - Limit, offset, and order options
   * @returns Array of record IDs
   *
   * @example
   * ```typescript
   * const ids = await odooService.search(
   *   'res.partner',
   *   [{ field: 'customer_rank', operator: '>', value: 0 }],
   *   { limit: 50, order: 'name asc' }
   * );
   * ```
   */
  async search(
    model: string,
    domain: SearchDomain[] = [],
    options: SearchOptions = {},
  ): Promise<number[]> {
    const searchDomain = domain.map((d) =>
      typeof d === 'string' ? d : [d.field, d.operator, d.value],
    );
    return this.executeKw(model, 'search', [searchDomain], options);
  }

  /**
   * Read records by their IDs
   *
   * @param model - Odoo model name
   * @param ids - Array of record IDs
   * @param options - Fields to retrieve
   * @returns Array of record objects
   *
   * @example
   * ```typescript
   * const partners = await odooService.read(
   *   'res.partner',
   *   [7, 14, 21],
   *   { fields: ['name', 'email', 'phone'] }
   * );
   * ```
   */
  async read(
    model: string,
    ids: number[],
    options: ReadOptions = {},
  ): Promise<any[]> {
    return this.executeKw(model, 'read', [ids], options);
  }

  /**
   * Search and read records in a single operation
   * More efficient than calling search() then read()
   *
   * @param model - Odoo model name
   * @param domain - Search criteria
   * @param options - Fields, limit, offset, and order
   * @returns Array of record objects
   *
   * @example
   * ```typescript
   * const invoices = await odooService.searchRead(
   *   'account.move',
   *   [
   *     { field: 'state', operator: '=', value: 'draft' },
   *     { field: 'move_type', operator: '=', value: 'out_invoice' }
   *   ],
   *   { fields: ['name', 'amount_total'], limit: 100 }
   * );
   * ```
   */
  async searchRead(
    model: string,
    domain: SearchDomain[] = [],
    options: SearchOptions & ReadOptions = {},
  ): Promise<any[]> {
    const searchDomain = domain.map((d) =>
      typeof d === 'string' ? d : [d.field, d.operator, d.value],
    );
    const sanitizedOptions = { ...options };
    if (sanitizedOptions.limit != null) {
      const n = Number(sanitizedOptions.limit);
      sanitizedOptions.limit = Number.isFinite(n) ? n : undefined;
    }
    if (sanitizedOptions.offset != null) {
      const n = Number(sanitizedOptions.offset);
      sanitizedOptions.offset = Number.isFinite(n) ? n : 0;
    }
    return this.executeKw(
      model,
      'search_read',
      [searchDomain],
      sanitizedOptions,
    );
  }

  /**
   * Create a new record
   *
   * @param model - Odoo model name
   * @param values - Field values for new record
   * @returns ID of created record
   *
   * @example
   * ```typescript
   * const partnerId = await odooService.create('res.partner', {
   *   name: 'Acme Corp',
   *   email: 'contact@acme.com',
   *   is_company: true
   * });
   * ```
   */
  async create(model: string, values: Record<string, any>): Promise<number> {
    return this.executeKw(model, 'create', [values]);
  }

  /**
   * Update existing records
   *
   * @param model - Odoo model name
   * @param ids - Array of record IDs to update
   * @param values - Fields to update
   * @returns True if successful
   *
   * @example
   * ```typescript
   * await odooService.write(
   *   'res.partner',
   *   [42],
   *   { phone: '+1234567890', email: 'new@email.com' }
   * );
   * ```
   */
  async write(
    model: string,
    ids: number[],
    values: Record<string, any>,
  ): Promise<boolean> {
    return this.executeKw(model, 'write', [ids, values]);
  }

  /**
   * Delete records permanently
   *
   * @param model - Odoo model name
   * @param ids - Array of record IDs to delete
   * @returns True if successful
   *
   * @example
   * ```typescript
   * await odooService.unlink('res.partner', [123, 456]);
   * ```
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    return this.executeKw(model, 'unlink', [ids]);
  }

  /**
   * Get metadata about model fields
   *
   * @param model - Odoo model name
   * @param attributes - Attributes to retrieve
   * @returns Field metadata object
   */
  async fieldsGet(
    model: string,
    attributes: string[] = ['string', 'help', 'type'],
  ): Promise<any> {
    return this.executeKw(model, 'fields_get', [], { attributes });
  }

  /**
   * Search records by name pattern
   *
   * @param model - Odoo model name
   * @param name - Name pattern to search
   * @param options - Search options
   * @returns Array of [id, name] tuples
   */
  async nameSearch(
    model: string,
    name: string = '',
    options: SearchOptions = {},
  ): Promise<any[]> {
    return this.executeKw(model, 'name_search', [name], options);
  }

  /**
   * Count records matching domain
   */
  async searchCount(
    model: string,
    domain: SearchDomain[] = [],
  ): Promise<number> {
    const searchDomain = domain.map((d) =>
      typeof d === 'string' ? d : [d.field, d.operator, d.value],
    );
    return this.executeKw(model, 'search_count', [searchDomain]);
  }
}
