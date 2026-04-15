import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DatabaseService } from '../../common/database/database.service';
import { WebhookRegistryService } from '../services/webhook-registry.service';
import { signPayload } from '../services/webhook-signer';
import { WebhookJobData } from '../services/webhook-emitter.service';
import { decrypt } from '../../common/crypto/encryption.util';
import { assertPublicHostname } from '../../common/security/ssrf.util';
import {
  WEBHOOK_QUEUE,
  WEBHOOK_BACKOFF_DELAYS_MS,
  WEBHOOK_DELIVERY_TIMEOUT_MS,
  WEBHOOK_MAX_FAILURES_BEFORE_DISABLE,
  WEBHOOK_RESPONSE_PREVIEW_LENGTH,
  LOG_SKIP_INACTIVE_REGISTRATION,
  LOG_WEBHOOK_DELIVERED,
  LOG_WEBHOOK_DELIVERY_FAILED,
  LOG_FAILED_TO_LOG_DELIVERY,
  DELIVERY_STATUS_SUCCESS,
  DELIVERY_STATUS_RETRYING,
  DELIVERY_STATUS_DEAD_LETTER,
  ERR_REGISTRATION_INACTIVE,
  errTimeout,
  errHttpStatus,
  errHttpStatusDetail,
  errRateLimited,
  errHttp429Retry,
} from '../../common/constants';

@Processor(WEBHOOK_QUEUE)
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: WebhookRegistryService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { eventId, eventType, registrationId, payload } = job.data;
    const attemptNumber = job.attemptsMade + 1;
    const startTime = Date.now();

    // Look up registration (with URL and signing secret)
    const registration = await this.db.webhookRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        url: true,
        active: true,
        encryptedSigningSecret: true,
        serviceName: true,
      },
    });

    if (!registration || !registration.active) {
      this.logger.warn({
        msg: LOG_SKIP_INACTIVE_REGISTRATION,
        registrationId,
        eventId,
      });
      // Log as dead-letter since registration is gone/inactive
      await this.logDelivery({
        registrationId,
        eventId,
        eventType,
        attemptNumber,
        status: DELIVERY_STATUS_DEAD_LETTER,
        errorMessage: ERR_REGISTRATION_INACTIVE,
        latencyMs: 0,
      });
      return; // Don't retry
    }

    // DNS rebinding protection: re-resolve hostname at delivery time
    const deliveryUrl = new URL(registration.url);
    await assertPublicHostname(deliveryUrl.hostname);

    // Sign the payload with the decrypted secret
    const timestamp = Date.now();
    const signingSecret = decrypt(registration.encryptedSigningSecret);
    const signature = signPayload(payload, signingSecret, timestamp);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        WEBHOOK_DELIVERY_TIMEOUT_MS,
      );

      const response = await fetch(registration.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': eventId,
          'X-Webhook-Event': eventType,
          'User-Agent': 'NestJS-Odoo-Webhook/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');
      const preview = responseBody.substring(
        0,
        WEBHOOK_RESPONSE_PREVIEW_LENGTH,
      );

      if (response.ok) {
        // Success
        await this.logDelivery({
          registrationId,
          eventId,
          eventType,
          attemptNumber,
          status: DELIVERY_STATUS_SUCCESS,
          httpStatusCode: response.status,
          responseBodyPreview: preview,
          latencyMs,
        });

        // Reset failure count on success
        await this.registry.resetFailureCount(registrationId);

        this.logger.log({
          msg: LOG_WEBHOOK_DELIVERED,
          registrationId,
          eventId,
          eventType,
          httpStatus: response.status,
          latencyMs,
        });
        return;
      }

      // Non-2xx response
      // Handle 429 with Retry-After
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : WEBHOOK_BACKOFF_DELAYS_MS[
              Math.min(attemptNumber - 1, WEBHOOK_BACKOFF_DELAYS_MS.length - 1)
            ];

        await this.logDelivery({
          registrationId,
          eventId,
          eventType,
          attemptNumber,
          status: DELIVERY_STATUS_RETRYING,
          httpStatusCode: 429,
          responseBodyPreview: preview,
          latencyMs,
          errorMessage: errRateLimited(delayMs),
        });

        // Re-throw to trigger BullMQ retry with explicit delay
        throw new Error(errHttp429Retry(delayMs));
      }

      // Other non-2xx
      await this.logDelivery({
        registrationId,
        eventId,
        eventType,
        attemptNumber,
        status: this.isLastAttempt(job)
          ? DELIVERY_STATUS_DEAD_LETTER
          : DELIVERY_STATUS_RETRYING,
        httpStatusCode: response.status,
        responseBodyPreview: preview,
        latencyMs,
        errorMessage: errHttpStatus(response.status),
      });

      await this.registry.incrementFailureCount(
        registrationId,
        WEBHOOK_MAX_FAILURES_BEFORE_DISABLE,
      );

      throw new Error(
        errHttpStatusDetail(response.status, preview.substring(0, 100)),
      );
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;

      // If it's an AbortError (timeout), log it
      if (error.name === 'AbortError') {
        await this.logDelivery({
          registrationId,
          eventId,
          eventType,
          attemptNumber,
          status: this.isLastAttempt(job)
            ? DELIVERY_STATUS_DEAD_LETTER
            : DELIVERY_STATUS_RETRYING,
          latencyMs,
          errorMessage: errTimeout(WEBHOOK_DELIVERY_TIMEOUT_MS),
        });

        await this.registry.incrementFailureCount(
          registrationId,
          WEBHOOK_MAX_FAILURES_BEFORE_DISABLE,
        );
      }

      // If it's not already logged (network errors, etc.)
      if (error.name !== 'AbortError' && !error.message?.startsWith('HTTP')) {
        await this.logDelivery({
          registrationId,
          eventId,
          eventType,
          attemptNumber,
          status: this.isLastAttempt(job)
            ? DELIVERY_STATUS_DEAD_LETTER
            : DELIVERY_STATUS_RETRYING,
          latencyMs,
          errorMessage: error.message?.substring(0, 500),
        });

        await this.registry.incrementFailureCount(
          registrationId,
          WEBHOOK_MAX_FAILURES_BEFORE_DISABLE,
        );
      }

      this.logger.error({
        msg: LOG_WEBHOOK_DELIVERY_FAILED,
        registrationId,
        eventId,
        eventType,
        attempt: attemptNumber,
        error: error.message,
        latencyMs,
      });

      throw error; // Re-throw so BullMQ handles retry/dead-letter
    }
  }

  /**
   * Custom backoff strategy: 30s, 5m, 30m, 2h, 8h
   */
  static backoffStrategy(attemptsMade: number): number {
    const index = Math.min(
      attemptsMade - 1,
      WEBHOOK_BACKOFF_DELAYS_MS.length - 1,
    );
    return WEBHOOK_BACKOFF_DELAYS_MS[index];
  }

  private isLastAttempt(job: Job): boolean {
    const maxAttempts = job.opts?.attempts ?? 6;
    return job.attemptsMade + 1 >= maxAttempts;
  }

  private async logDelivery(data: {
    registrationId: string;
    eventId: string;
    eventType: string;
    attemptNumber: number;
    status: string;
    httpStatusCode?: number;
    responseBodyPreview?: string;
    latencyMs: number;
    errorMessage?: string;
  }) {
    try {
      await this.db.webhookDeliveryLog.create({ data });
    } catch (err: any) {
      this.logger.error({
        msg: LOG_FAILED_TO_LOG_DELIVERY,
        error: err.message,
        ...data,
      });
    }
  }
}
