import { Injectable } from '@nestjs/common';
import { OdooService } from '../../odoo/odoo.service';
import {
  SearchDomain,
  SearchOptions,
  ReadOptions,
} from '../../odoo/interfaces';

/**
 * Abstract base service for model-specific Odoo services
 * Provides common CRUD operations for any Odoo model
 *
 * @remarks
 * Extend this class to create type-safe, model-specific services
 * that encapsulate business logic for particular Odoo models.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PartnerService extends BaseOdooService {
 *   constructor(odooService: OdooService) {
 *     super(odooService, 'res.partner');
 *   }
 *
 *   async findCompanies(limit = 50) {
 *     return this.searchRead(
 *       [{ field: 'is_company', operator: '=', value: true }],
 *       { fields: ['name', 'email'], limit }
 *     );
 *   }
 * }
 * ```
 *
 * @public
 */
@Injectable()
export abstract class BaseOdooService {
  /**
   * Create a base service instance
   *
   * @param odooService - Core Odoo service
   * @param modelName - Odoo model name (e.g., 'res.partner')
   */
  constructor(
    protected readonly odooService: OdooService,
    protected readonly modelName: string,
  ) {}

  /**
   * Find a single record by ID
   *
   * @param id - Record ID
   * @param fields - Optional fields to retrieve
   * @returns Record object or undefined if not found
   */
  async findOne(id: number, fields?: string[]): Promise<any> {
    const records = await this.odooService.read(this.modelName, [id], {
      fields,
    });
    return records[0];
  }

  /**
   * Search and read records matching criteria
   *
   * @param domain - Search criteria
   * @param options - Query options (fields, limit, offset, order)
   * @returns Array of matching records
   */
  async searchRead(
    domain: SearchDomain[] = [],
    options: SearchOptions & ReadOptions = {},
  ): Promise<any[]> {
    return this.odooService.searchRead(this.modelName, domain, options);
  }

  /**
   * Cached search and read — returns Redis-cached results when available.
   * Use for read-heavy, infrequently-changing data.
   *
   * @param domain - Search criteria
   * @param options - Query options
   * @param ttl - Cache TTL in seconds (default 60)
   */
  async cachedSearchRead(
    domain: SearchDomain[] = [],
    options: SearchOptions & ReadOptions = {},
    ttl?: number,
  ): Promise<any[]> {
    return this.odooService.cachedSearchRead(
      this.modelName,
      domain,
      options,
      ttl,
    );
  }

  /**
   * Create a new record
   *
   * @param values - Field values
   * @returns ID of created record
   */
  async create(values: Record<string, any>): Promise<number> {
    const id = await this.odooService.create(this.modelName, values);
    await this.odooService.invalidateModelCache(this.modelName);
    return id;
  }

  /**
   * Update an existing record
   *
   * @param id - Record ID
   * @param values - Fields to update
   * @returns True if successful
   */
  async update(id: number, values: Record<string, any>): Promise<boolean> {
    const result = await this.odooService.write(this.modelName, [id], values);
    await this.odooService.invalidateModelCache(this.modelName);
    return result;
  }

  /**
   * Delete a record
   *
   * @param id - Record ID
   * @returns True if successful
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.odooService.unlink(this.modelName, [id]);
    await this.odooService.invalidateModelCache(this.modelName);
    return result;
  }

  /**
   * Execute a custom model method
   *
   * @param method - Method name
   * @param args - Positional arguments
   * @param kwargs - Named arguments
   * @returns Method result
   */
  async executeKw(
    method: string,
    args: any[] = [],
    kwargs: any = {},
  ): Promise<any> {
    return this.odooService.executeKw(this.modelName, method, args, kwargs);
  }

  /**
   * Count records matching criteria
   *
   * @param domain - Search criteria
   * @returns Number of matching records
   */
  async count(domain: SearchDomain[] = []): Promise<number> {
    return this.odooService.searchCount(this.modelName, domain);
  }

  /**
   * Get the model name this service manages
   */
  getModelName(): string {
    return this.modelName;
  }
}
