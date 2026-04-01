import { Injectable } from '@nestjs/common';
import { OdooService } from '../odoo.service';
import { BaseOdooService } from '../services/base.service';

@Injectable()
export class OdooServiceFactory {
  constructor(private readonly odooService: OdooService) {}

  createForModel(modelName: string): BaseOdooService {
    class ConcreteOdooService extends BaseOdooService {}
    return new ConcreteOdooService(this.odooService, modelName);
  }
}
