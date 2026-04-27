import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { IApiKeyProvider, ApiKeyContext } from '../interfaces';
import { DatabaseService } from '../../common/database/database.service';
import {
  API_KEY_CACHE_PREFIX,
  API_KEY_CACHE_TTL,
} from '../../common/constants';

@Injectable()
export class ApiKeyProvider implements IApiKeyProvider {
  private readonly logger = new Logger(ApiKeyProvider.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async validate(rawKey: string): Promise<ApiKeyContext | null> {
    const keyHash = await this.hashKey(rawKey);
    const prefix = rawKey.slice(0, 8);

    // Check Redis cache first (keyed by hash, not plaintext)
    const cached = await this.redis.get(`${API_KEY_CACHE_PREFIX}${keyHash}`);
    if (cached) {
      return JSON.parse(cached) as ApiKeyContext;
    }

    // Fast-path: look up by prefix first, then verify hash
    const candidates = await this.db.apiKey.findMany({
      where: { prefix, isActive: true },
    });

    let record = candidates.find((c) => {
      const a = Buffer.from(c.keyHash, 'hex');
      const b = Buffer.from(keyHash, 'hex');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });

    // Fall back to legacy SHA-256 hash for keys created before the scrypt migration
    if (!record) {
      const legacyHash = this.hashKeyLegacy(rawKey);
      record = candidates.find((c) => {
        const a = Buffer.from(c.keyHash, 'hex');
        const b = Buffer.from(legacyHash, 'hex');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      });

      if (record) {
        // Upgrade stored hash from SHA-256 to scrypt (fire-and-forget)
        this.db.apiKey
          .update({ where: { id: record.id }, data: { keyHash } })
          .catch(() => {});
      }
    }

    if (!record) {
      return null;
    }

    if (record.revokedAt) {
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

    // Cache the validated context
    await this.redis.set(
      `${API_KEY_CACHE_PREFIX}${keyHash}`,
      JSON.stringify(context),
      'EX',
      API_KEY_CACHE_TTL,
    );

    // Update last-used metadata (fire-and-forget)
    this.db.apiKey
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return context;
  }

  /** Immediately evict a key from cache on revocation. */
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
}
