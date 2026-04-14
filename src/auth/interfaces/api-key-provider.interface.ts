export interface IApiKeyProvider {
  validate(apiKey: string): Promise<ApiKeyContext | null>;
}

export interface ApiKeyContext {
  /** Internal API key record ID */
  keyId: string;
  /** Identifier for the external system */
  systemName: string;
  /** Permission scopes granted to this key */
  scopes: string[];
  /** Rate limit tier for this key */
  rateLimitTier: string;
}

export { API_KEY_PROVIDER } from '../../common/constants';
