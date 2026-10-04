import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OdooService } from './odoo.service';
import { XmlRpcClientFactory } from './factories/xml-rpc-client.factory';
import { OdooServiceFactory } from './factories/odoo-service.factory';
import { OdooConfigService } from './infrastructure/config/odoo.config';
import { RedisModule } from '../redis/redis.module';
import { ODOO_MODULE_OPTIONS } from '../common/constants';
import {
  OdooModuleAsyncOptions,
  OdooModuleOptions,
} from './interfaces/odoo-module-options.interface';

const ODOO_PROVIDERS: Provider[] = [
  OdooService,
  OdooConfigService,
  XmlRpcClientFactory,
  OdooServiceFactory,
];
const ODOO_EXPORTS = [OdooService, OdooServiceFactory, OdooConfigService];

/** Backing module for `OdooModule.forRoot()` / `OdooModule.forRootAsync()` */
@Global()
@Module({})
export class OdooCoreModule {}

/**
 * Core Odoo XML-RPC client. Global: import it once in your root module.
 *
 * - `OdooModule` — configured from environment variables, Redis cache enabled.
 * - `OdooModule.forRoot(options)` — explicit configuration.
 * - `OdooModule.forRootAsync({ useFactory, inject })` — configuration from other providers.
 *
 * This module registers no HTTP routes. For the generic REST API use `OdooApiModule`.
 */
@Global()
@Module({
  imports: [ConfigModule, RedisModule],
  providers: ODOO_PROVIDERS,
  exports: ODOO_EXPORTS,
})
export class OdooModule {
  static forRoot(options: OdooModuleOptions = {}): DynamicModule {
    const { cache = true, ...connection } = options;
    return {
      module: OdooCoreModule,
      global: true,
      imports: [ConfigModule, ...(cache ? [RedisModule] : [])],
      providers: [
        { provide: ODOO_MODULE_OPTIONS, useValue: connection },
        ...ODOO_PROVIDERS,
      ],
      exports: ODOO_EXPORTS,
    };
  }

  static forRootAsync(options: OdooModuleAsyncOptions): DynamicModule {
    const { cache = true, imports = [], useFactory, inject = [] } = options;
    return {
      module: OdooCoreModule,
      global: true,
      imports: [ConfigModule, ...(cache ? [RedisModule] : []), ...imports],
      providers: [
        { provide: ODOO_MODULE_OPTIONS, useFactory, inject },
        ...ODOO_PROVIDERS,
      ],
      exports: ODOO_EXPORTS,
    };
  }
}
