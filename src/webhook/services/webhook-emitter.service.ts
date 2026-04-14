import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { DatabaseService } from '../../common/database/database.service';
import {
  WEBHOOK_QUEUE,
  WEBHOOK_REG_CACHE_PREFIX,
  WEBHOOK_REG_CACHE_TTL,
  LOG_NO_ACTIVE_REGISTRATIONS,
  LOG_WEBHOOK_EVENT_EMITTED,
} from '../../common/constants';

export interface WebhookJobData {
  eventId: string;
  eventType: string;
  registrationId: string;
  payload: string; // JSON-stringified
}

@Injectable()
export class WebhookEmitterService {
  private readonly logger = new Logger(WebhookEmitterService.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Emit a webhook event scoped to the calling application.
   * Only delivers to registrations whose serviceName matches the caller.
   * Never awaits actual delivery — returns immediately after enqueuing.
   */
  async emit(
    systemName: string,
    eventType: string,
    payload: Record<string, any>,
  ): Promise<{ eventId: string; jobsEnqueued: number }> {
    // Persist the event
    const event = await this.db.webhookEvent.create({
      data: {
        type: eventType,
        payload,
      },
    });

    // Find active registrations for THIS application matching the event type (cached)
    const registrations = await this.getActiveRegistrations(
      systemName,
      eventType,
    );

    if (registrations.length === 0) {
      this.logger.debug({
        msg: LOG_NO_ACTIVE_REGISTRATIONS,
        eventType,
        eventId: event.id,
      });
      return { eventId: event.id, jobsEnqueued: 0 };
    }

    // Enqueue one job per registration
    const payloadStr = JSON.stringify(payload);
    const jobs = registrations.map((reg) => ({
      name: `deliver:${event.id}:${reg.id}`,
      data: {
        eventId: event.id,
        eventType,
        registrationId: reg.id,
        payload: payloadStr,
      } satisfies WebhookJobData,
      opts: {
        attempts: 6, // initial + 5 retries
        backoff: {
          type: 'custom' as const,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }));

    await this.webhookQueue.addBulk(jobs);

    this.logger.log({
      msg: LOG_WEBHOOK_EVENT_EMITTED,
      eventId: event.id,
      eventType,
      registrations: registrations.length,
    });

    return { eventId: event.id, jobsEnqueued: registrations.length };
  }

  /**
   * Fetch active registrations with a short Redis cache.
   * Only caches { id, serviceName } — no secrets.
   */
  private async getActiveRegistrations(
    systemName: string,
    eventType: string,
  ): Promise<{ id: string; serviceName: string }[]> {
    const cacheKey = `${WEBHOOK_REG_CACHE_PREFIX}${systemName}:${eventType}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const registrations = await this.db.webhookRegistration.findMany({
      where: {
        active: true,
        serviceName: systemName,
        eventTypes: { has: eventType },
      },
      select: { id: true, serviceName: true },
    });

    await this.redis.set(
      cacheKey,
      JSON.stringify(registrations),
      'EX',
      WEBHOOK_REG_CACHE_TTL,
    );

    return registrations;
  }

  /**
   * Invalidate all cached registration lookups for a given service.
   * Called by WebhookRegistryService on register/update/disable.
   */
  async invalidateRegistrationCache(serviceName: string): Promise<void> {
    const pattern = `${WEBHOOK_REG_CACHE_PREFIX}${serviceName}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
