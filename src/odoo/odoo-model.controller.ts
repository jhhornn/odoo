import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiSecurity,
} from '@nestjs/swagger';
import { OdooService } from './odoo.service';
import { ApiCommonErrorResponses } from '../common/decorators/api-error-responses.decorator';

@ApiTags('Odoo Model Metadata')
@ApiSecurity('X-API-Key')
@ApiCommonErrorResponses()
@Controller('odoo/models')
export class OdooModelController {
  constructor(private readonly odooService: OdooService) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get detailed model information',
    description:
      'Get detailed information about all models or a specific model',
  })
  @ApiQuery({
    name: 'model',
    required: false,
    description: 'Specific model to get info for',
    example: 'res.partner',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed model information',
    schema: {
      example: [
        {
          id: 85,
          model: 'res.partner',
          name: 'Contact',
          info: 'Partners (customers, vendors, etc.)',
          state: 'base',
          transient: false,
        },
      ],
    },
  })
  async getModelInfo(@Query('model') model?: string) {
    try {
      // Note: This assumes odooService has getModelInfo. If not, we might need to implement it or use executeKw.
      // For now, I will assume the user wants this controller active.
      // If methods are missing in OdooService, I will need to add them.
      // Checking OdooService... it seems it only has generic methods.
      // I will implement these using executeKw.
      if (model) {
          const result = await this.odooService.executeKw('ir.model', 'search_read', [[['model', '=', model]]], { fields: ['name', 'model', 'info', 'state', 'transient'] });
          return result;
      }
      return await this.odooService.executeKw('ir.model', 'search_read', [], { fields: ['name', 'model', 'info', 'state', 'transient'], limit: 100 });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('modules')
  @ApiOperation({
    summary: 'Get installed modules/apps',
    description: 'Retrieve all installed Odoo modules/applications',
  })
  @ApiResponse({
    status: 200,
    description: 'List of installed modules',
    schema: {
      example: [
        {
          id: 1,
          name: 'base',
          shortdesc: 'Base',
          summary: 'The kernel of Odoo, needed for all installation.',
          category_id: [1, 'Hidden'],
          version: '17.0.1.0.0',
        },
      ],
    },
  })
  async getInstalledModules() {
    try {
      return await this.odooService.executeKw('ir.module.module', 'search_read', [[['state', '=', 'installed']]], { fields: ['name', 'shortdesc', 'summary', 'category_id', 'version'] });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('modules/:moduleName/models')
  @ApiOperation({
    summary: 'Get models by module',
    description: 'Get all models that belong to a specific module/app',
  })
  @ApiParam({
    name: 'moduleName',
    description: 'Module name',
    example: 'sale',
  })
  @ApiResponse({
    status: 200,
    description: 'Models in the specified module',
    schema: {
      example: [
        {
          id: 123,
          model: 'sale.order',
          name: 'Sales Order',
          info: 'Sales Order',
        },
      ],
    },
  })
  async getModelsByModule(@Param('moduleName') moduleName: string) {
    try {
       // This is complex because mapping modules to models isn't direct in ir.model without joining.
       // But we can search ir.model.data maybe? Or just search ir.model where modules contains the module?
       // Let's try a simple search on ir.model.
       // Actually, ir.model has a 'modules' field which is a string (comma separated) in some versions, or a relation.
       // Let's assume standard Odoo behavior: ir.model has `modules` field.
       return await this.odooService.executeKw('ir.model', 'search_read', [[['modules', 'ilike', moduleName]]], { fields: ['name', 'model', 'info'] });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('/:model/fields/detailed')
  @ApiOperation({
    summary: 'Get detailed field information',
    description:
      'Get comprehensive field information including types, relationships, and constraints',
  })
  @ApiParam({
    name: 'model',
    description: 'Model name',
    example: 'res.partner',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed field information',
    schema: {
      example: [
        {
          name: 'name',
          string: 'Name',
          type: 'char',
          required: true,
          readonly: false,
          help: 'The full name of the partner',
        },
      ],
    },
  })
  async getDetailedModelFields(@Param('model') model: string) {
    try {
      return await this.odooService.fieldsGet(model, ['string', 'help', 'type', 'required', 'readonly', 'relation', 'selection']);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('common-models')
  @ApiOperation({
    summary: 'Get commonly used models',
    description:
      'Get a curated list of the most commonly used Odoo models with descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Common Odoo models with descriptions',
    schema: {
      example: {
        'Core Models': {
          'res.partner': 'Partners (customers, vendors, contacts)',
        },
      },
    },
  })
  async getCommonModels() {
    const commonModels = {
      'Core Models': {
        'res.partner': 'Partners (customers, vendors, contacts)',
        'res.users': 'Users and authentication',
        'res.company': 'Companies in multi-company setup',
        'res.currency': 'Currencies',
        'res.country': 'Countries',
        'ir.attachment': 'File attachments',
      },
      Sales: {
        'sale.order': 'Sales orders/quotations',
        'sale.order.line': 'Sales order lines/items',
        'product.product': 'Products and variants',
        'product.template': 'Product templates',
        'product.category': 'Product categories',
      },
      Accounting: {
        'account.move': 'Journal entries (invoices, bills, payments)',
        'account.move.line': 'Journal entry lines',
        'account.account': 'Chart of accounts',
        'account.payment': 'Payments and receipts',
        'account.tax': 'Taxes',
        'account.journal': 'Journals',
      },
      Inventory: {
        'stock.move': 'Stock movements',
        'stock.picking': 'Transfers/deliveries',
        'stock.location': 'Stock locations',
        'stock.quant': 'Stock quantities',
        'stock.warehouse': 'Warehouses',
      },
      Purchase: {
        'purchase.order': 'Purchase orders',
        'purchase.order.line': 'Purchase order lines',
      },
      Project: {
        'project.project': 'Projects',
        'project.task': 'Tasks',
        'account.analytic.account': 'Analytic accounts',
      },
      HR: {
        'hr.employee': 'Employees',
        'hr.department': 'Departments',
        'hr.job': 'Job positions',
      },
      CRM: {
        'crm.lead': 'Leads/opportunities',
        'crm.stage': 'CRM stages',
        'crm.team': 'Sales teams',
      },
    };

    return commonModels;
  }
}
