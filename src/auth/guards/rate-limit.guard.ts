import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_DEFAULT_MAX,
  RATE_LIMIT_PREMIUM_MAX,
  LOG_RATE_LIMIT_EXCEEDED,
  ERR_TOO_MANY_REQUESTS,
} from '../../common/constants';

/** Marks a request already counted, so stacked guard instances count it once */
const RATE_LIMIT_APPLIED = Symbol('odooRateLimitApplied');

interface TierConfig {
  windowMs: number;
  maxRequests: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly tiers: Record<string, TierConfig>;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    // Optional: guards are instantiated in each host module, which may not see ConfigService
    @Optional() private readonly config?: ConfigService,
  ) {
    this.tiers = {
      default: {
        windowMs: RATE_LIMIT_WINDOW_MS,
        maxRequests: this.readLimit(
          'RATE_LIMIT_DEFAULT_MAX',
          RATE_LIMIT_DEFAULT_MAX,
        ),
      },
      premium: {
        windowMs: RATE_LIMIT_WINDOW_MS,
        maxRequests: this.readLimit(
          'RATE_LIMIT_PREMIUM_MAX',
          RATE_LIMIT_PREMIUM_MAX,
        ),
      },
    };
  }

  private readLimit(key: string, fallback: number): number {
    const raw = this.config?.get<string>(key) ?? process.env[key];
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyContext = request.apiKeyContext;

    // If no API key context (e.g. public endpoint), skip rate limiting
    if (!apiKeyContext || request[RATE_LIMIT_APPLIED]) return true;
    request[RATE_LIMIT_APPLIED] = true;

    const tier =
      this.tiers[apiKeyContext.rateLimitTier] ?? this.tiers['default'];
    const key = `ratelimit:${apiKeyContext.keyId}`;
    const now = Date.now();
    const windowStart = now - tier.windowMs;

    // Sliding window using a Redis sorted set
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // remove expired entries
    pipeline.zadd(key, now, `${now}:${Math.random()}`); // add current request
    pipeline.zcard(key); // count requests in window
    pipeline.pexpire(key, tier.windowMs); // set TTL

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number;

    if (count > tier.maxRequests) {
      const retryAfterSec = Math.ceil(tier.windowMs / 1000);
      const response = context.switchToHttp().getResponse();
      response.setHeader('Retry-After', String(retryAfterSec));

      this.logger.warn({
        msg: LOG_RATE_LIMIT_EXCEEDED,
        keyId: apiKeyContext.keyId,
        systemName: apiKeyContext.systemName,
        count,
        limit: tier.maxRequests,
      });

      throw new HttpException(
        {
          statusCode: 429,
          message: ERR_TOO_MANY_REQUESTS,
          retryAfter: retryAfterSec,
        },
        429,
      );
    }

    return true;
  }
}
