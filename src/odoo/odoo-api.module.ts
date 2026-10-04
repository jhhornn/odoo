import { DynamicModule, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OdooController } from './odoo.controller';
import { OdooModelController } from './odoo-model.controller';
import { OdooModelAccessGuard } from './guards/odoo-model-access.guard';
import { ODOO_API_MODULE_OPTIONS } from '../common/constants';
import { OdooApiModuleOptions } from './interfaces/odoo-module-options.interface';

/**
 * Opt-in generic REST routes (`/odoo/:model/*` and `/odoo/models/*`).
 *
 * Every route requires a valid API key and is rate limited. Restrict what is
 * reachable with `allowedModels` and `requiredScopes`: these routes act with
 * the full permissions of the configured Odoo integration user.
 *
 * Requires `OdooModule`, plus `DatabaseModule` and `RedisModule` for API keys.
 *
 * @example
 * ```typescript
 * OdooApiModule.register({
 *   allowedModels: ['res.partner', 'product.product'],
 *   requiredScopes: ['odoo:generic'],
 * })
 * ```
 */
@Module({})
export class OdooApiModule {
  static register(options: OdooApiModuleOptions = {}): DynamicModule {
    return {
      module: OdooApiModule,
      imports: [AuthModule],
      // Metadata routes first: `/odoo/models/info` must not match `/odoo/:model/:id`
      controllers: [OdooModelController, OdooController],
      providers: [
        { provide: ODOO_API_MODULE_OPTIONS, useValue: options },
        OdooModelAccessGuard,
      ],
    };
  }
}
