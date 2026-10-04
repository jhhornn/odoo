import { ModuleMetadata } from '@nestjs/common';

/**
 * Connection settings for {@link OdooModule.forRoot}.
 * Any value left out falls back to the matching environment variable
 * (`ODOO_URL`, `ODOO_DATABASE`, `ODOO_USERNAME`, `ODOO_PASSWORD`, `ODOO_TIMEOUT_MS`).
 */
export interface OdooConnectionOptions {
  /** Base URL of the Odoo server, e.g. `https://acme.odoo.com` */
  url?: string;
  /** Odoo database name */
  database?: string;
  /** Login of the integration user */
  username?: string;
  /** Password or (recommended) API key of the integration user */
  password?: string;
  /** Per-call XML-RPC timeout in milliseconds (default 30000) */
  timeoutMs?: number;
}

export interface OdooModuleOptions extends OdooConnectionOptions {
  /**
   * Register the Redis-backed cache used by `cachedSearchRead` (default `true`).
   * When `false`, Redis is not required and cached reads go straight to Odoo.
   */
  cache?: boolean;
}

export interface OdooModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: any[]
  ) => OdooConnectionOptions | Promise<OdooConnectionOptions>;
  inject?: any[];
  /** See {@link OdooModuleOptions.cache} */
  cache?: boolean;
}

/** Options for the opt-in generic REST routes in `OdooApiModule`. */
export interface OdooApiModuleOptions {
  /**
   * Odoo models reachable through `/odoo/:model/*`. When omitted, every model
   * the integration user can access is reachable — prefer an explicit list.
   */
  allowedModels?: string[];
  /** API-key scopes required on every generic route (default none) */
  requiredScopes?: string[];
}
