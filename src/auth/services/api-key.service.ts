import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { ApiKeyProvider } from '../providers/api-key.provider';
import {
  API_KEY_PREFIX,
  LOG_API_KEY_CREATED,
  LOG_API_KEY_REVOKED,
} from '../../common/constants';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly keyProvider: ApiKeyProvider,
  ) {}

  /**
   * Create a new API key. Returns the plaintext key exactly once.
   * Only the SHA-256 hash and 8-char prefix are stored.
   */
  async create(data: {
    systemName: string;
    scopes?: string[];
    rateLimitTier?: string;
    expiresAt?: Date;
  }): Promise<{ id: string; key: string; prefix: string; systemName: string }> {
    const rawBytes = crypto.randomBytes(32);
    const rawKey = API_KEY_PREFIX + rawBytes.toString('base64url');
    const prefix = rawKey.slice(0, 8);
    const keyHash = this.keyProvider.hashKey(rawKey);

    const record = await this.db.apiKey.create({
      data: {
        prefix,
        keyHash,
        systemName: data.systemName,
        scopes: data.scopes ?? [],
        rateLimitTier: data.rateLimitTier ?? 'default',
        expiresAt: data.expiresAt,
      },
    });

    this.logger.log({
      msg: LOG_API_KEY_CREATED,
      keyId: record.id,
      systemName: data.systemName,
    });

    // Return plaintext only this once
    return {
      id: record.id,
      key: rawKey,
      prefix,
      systemName: record.systemName,
    };
  }

  /**
   * List all API keys (prefix + metadata only — never the hash or plaintext).
   */
  async list() {
    return this.db.apiKey.findMany({
      select: {
        id: true,
        prefix: true,
        systemName: true,
        scopes: true,
        rateLimitTier: true,
        isActive: true,
        revokedAt: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a key immediately. Evicts from Redis cache.
   */
  async revoke(id: string): Promise<void> {
    const record = await this.db.apiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });

    // Evict from cache by hash
    await this.keyProvider.evict(record.keyHash);

    this.logger.log({
      msg: LOG_API_KEY_REVOKED,
      keyId: id,
      systemName: record.systemName,
    });
  }
}
