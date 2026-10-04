import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { IApiKeyProvider, ApiKeyContext } from '../interfaces';
import { DatabaseService } from '../../common/database/database.service';
import {
  API_KEY_CACHE_PREFIX,
  API_KEY_CACHE_TTL,
  API_KEY_PREFIX,
} from '../../common/constants';

const LOOKUP_ID_LENGTH = 8;

/**
 * Lookup identifier stored in `api_keys.prefix`: the first 8 random characters
 * after the fixed `octo_odoo_` marker, so it narrows a lookup to one row.
 */
export function apiKeyLookupId(rawKey: string): string {
  return rawKey.slice(
    API_KEY_PREFIX.length,
    API_KEY_PREFIX.length + LOOKUP_ID_LENGTH,
  );
}

/** Identifier used by keys created before v0.2.0 (always `octo_odo`) */
function legacyLookupId(rawKey: string): string {
  return rawKey.slice(0, LOOKUP_ID_LENGTH);
}

@Injectable()
export class ApiKeyProvider implements IApiKeyProvider {
  private readonly logger = new Logger(ApiKeyProvider.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async validate(rawKey: string): Promise<ApiKeyContext | null> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

    // Keys carry 256 bits of entropy, so a fast SHA-256 is a safe cache key
    // and lets cache hits skip the deliberately slow scrypt hash.
    const cacheKey = this.cacheKey(rawKey);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ApiKeyContext;
    }

    const lookupId = apiKeyLookupId(rawKey);
    const legacyId = legacyLookupId(rawKey);
    const candidates = await this.db.apiKey.findMany({
      where: { prefix: { in: [lookupId, legacyId] }, isActive: true },
    });

    // Unknown identifier: reject without spending CPU on scrypt
    if (candidates.length === 0) {
      return null;
    }

    const keyHash = await this.hashKey(rawKey);
    let record = candidates.find((c) => this.hashEquals(c.keyHash, keyHash));

    // Fall back to legacy SHA-256 hash for keys created before the scrypt migration
    let upgradeHash = false;
    if (!record) {
      const legacyHash = this.hashKeyLegacy(rawKey);
      record = candidates.find((c) => this.hashEquals(c.keyHash, legacyHash));
      upgradeHash = Boolean(record);
    }

    if (!record || record.revokedAt) {
      return null;
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      return null;
    }

    const context: ApiKeyContext = {
      keyId: record.id,
      systemName: record.systemName,
      scopes: record.scopes,
      rateLimitTier: record.rateLimitTier,
    };

    // Cache the validated context, plus a pointer so revocation can evict it
    await this.redis
      .multi()
      .set(cacheKey, JSON.stringify(context), 'EX', API_KEY_CACHE_TTL)
      .set(this.idPointerKey(record.id), cacheKey, 'EX', API_KEY_CACHE_TTL)
      .exec();

    // Update last-used metadata and upgrade legacy rows (fire-and-forget)
    this.db.apiKey
      .update({
        where: { id: record.id },
        data: {
          lastUsedAt: new Date(),
          ...(record.prefix !== lookupId && { prefix: lookupId }),
          ...(upgradeHash && { keyHash }),
        },
      })
      .catch((err) =>
        this.logger.warn(`Failed to update API key metadata: ${err.message}`),
      );

    return context;
  }

  /** Immediately evict a key's cached context (call on revocation). */
  async evictKeyId(keyId: string): Promise<void> {
    const pointer = this.idPointerKey(keyId);
    const cacheKey = await this.redis.get(pointer);
    await this.redis.del(pointer, ...(cacheKey ? [cacheKey] : []));
  }

  /**
   * @deprecated Cached contexts are no longer keyed by the stored hash.
   * Use {@link evictKeyId}.
   */
  async evict(keyHash: string): Promise<void> {
    await this.redis.del(`${API_KEY_CACHE_PREFIX}${keyHash}`);
  }

  private static readonly SCRYPT_SALT = 'odoo-api-key-v1';
  private static readonly SCRYPT_KEYLEN = 64;
  private static readonly SCRYPT_OPTIONS: crypto.ScryptOptions = {
    N: 16384,
    r: 8,
    p: 1,
  };

  async hashKey(rawKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        rawKey,
        ApiKeyProvider.SCRYPT_SALT,
        ApiKeyProvider.SCRYPT_KEYLEN,
        ApiKeyProvider.SCRYPT_OPTIONS,
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('hex'));
        },
      );
    });
  }

  private hashKeyLegacy(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  private hashEquals(storedHex: string, candidateHex: string): boolean {
    const a = Buffer.from(storedHex, 'hex');
    const b = Buffer.from(candidateHex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  private cacheKey(rawKey: string): string {
    const digest = crypto.createHash('sha256').update(rawKey).digest('hex');
    return `${API_KEY_CACHE_PREFIX}v2:${digest}`;
  }

  private idPointerKey(keyId: string): string {
    return `${API_KEY_CACHE_PREFIX}id:${keyId}`;
  }
}
