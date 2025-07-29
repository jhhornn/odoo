import { Injectable } from '@nestjs/common';
import { OdooService } from '../odoo.service';
import { SearchDomain, SearchOptions, ReadOptions } from '../interfaces';

@Injectable()
export abstract class BaseOdooService {
  constructor(
    protected readonly odooService: OdooService,
    protected readonly modelName: string,
  ) {}

  async findOne(id: number, fields?: string[]) {
    const records = await this.odooService.read(this.modelName, [id], {
      fields,
    });
    return records[0];
  }

  async searchRead(
    domain: SearchDomain[] = [],
    options: SearchOptions & ReadOptions = {},
  ) {
    return this.odooService.searchRead(this.modelName, domain, options);
  }

  async create(values: Record<string, any>) {
    return this.odooService.create(this.modelName, values);
  }

  async update(id: number, values: Record<string, any>) {
    return this.odooService.write(this.modelName, [id], values);
  }

  async delete(id: number) {
    return this.odooService.unlink(this.modelName, [id]);
  }

  async executeKw(method: string, args: any[] = [], kwargs: any = {}) {
    return this.odooService.executeKw(this.modelName, method, args, kwargs);
  }
}
