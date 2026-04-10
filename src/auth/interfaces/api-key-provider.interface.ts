/**
 * Interface for API key validation providers.
 * Currently backed by environment variables, but designed for
 * easy migration to database-backed storage.
 *
 * To migrate to DB: implement this interface with a DB-backed provider
 * and register it as the API_KEY_PROVIDER in the auth module.
 */
export interface IApiKeyProvider {
  /**
   * Validate an API key and return the associated context if valid.
   * @param apiKey - The API key to validate
   * @returns Context object with company_id and system info, or null if invalid
   */
  validate(apiKey: string): Promise<ApiKeyContext | null>;
}

export interface ApiKeyContext {
  /** The Odoo company ID this external system syncs to */
  companyId: number;
  /** Identifier for the external system */
  systemName: string;
  /** Optional webhook URL for status callbacks */
  webhookUrl?: string;
  /** Optional webhook secret/token for authenticating callbacks */
  webhookToken?: string;
}

export const API_KEY_PROVIDER = 'API_KEY_PROVIDER';
