import { Injectable } from '@nestjs/common';
import { BaseOdooService } from '../odoo/services/base.service';
import { OdooService } from '../odoo/odoo.service';

@Injectable()
export class InvoiceService extends BaseOdooService {
  constructor(odooService: OdooService) {
    super(odooService, 'account.move');
  }
}
