import { Injectable } from '@nestjs/common';
import { OdooService } from '../odoo.service';
import { BaseOdooService } from '../../common/services/base.service';

/**
 * Factory for creating model-specific services
 * Enables dynamic service instantiation
 */
@Injectable()
export class OdooServiceFactory {
  constructor(private readonly odooService: OdooService) {}

  /**
   * Create service for specific Odoo model
   * @param modelName - Odoo model name (e.g., 'res.partner')
   */
  createForModel(modelName: string): BaseOdooService {
    return new (class extends BaseOdooService {
      constructor(odooService: OdooService, modelName: string) {
        super(odooService, modelName);
      }
    })(this.odooService, modelName);
  }
}
