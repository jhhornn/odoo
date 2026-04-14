import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as net from 'net';
import { DatabaseService } from '../../common/database/database.service';
import { encrypt, decrypt } from '../../common/crypto/encryption.util';
import { isPrivateIp } from '../../common/security/ssrf.util';
import { WebhookEmitterService } from './webhook-emitter.service';
import {
  LOG_WEBHOOK_REGISTERED,
  LOG_WEBHOOK_AUTO_DISABLED,
  ERR_WEBHOOK_REGISTRATION_NOT_FOUND,
  ERR_INVALID_URL_FORMAT,
  ERR_WEBHOOK_URL_MUST_USE_HTTPS,
  ERR_WEBHOOK_URL_PRIVATE_ADDRESS,
  errWebhookServiceNameNotFound,
} from '../../common/constants';

@Injectable()
export class WebhookRegistryService {
  private readonly logger = new Logger(WebhookRegistryService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => WebhookEmitterService))
    private readonly emitter: WebhookEmitterService,
  ) {}

  /**
   * Register a new webhook. Returns the signing_secret exactly once.
   */
  async register(data: {
    serviceName: string;
    url: string;
    eventTypes: string[];
  }): Promise<{
    id: string;
    serviceName: string;
    url: string;
    signingSecret: string;
    eventTypes: string[];
  }> {
    this.validateUrl(data.url);
    await this.validateServiceName(data.serviceName);

    const signingSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSigningSecret = encrypt(signingSecret);

    const registration = await this.db.webhookRegistration.create({
      data: {
        serviceName: data.serviceName,
        url: data.url,
        encryptedSigningSecret,
        eventTypes: data.eventTypes,
      },
    });

    this.logger.log({
      msg: LOG_WEBHOOK_REGISTERED,
      registrationId: registration.id,
      serviceName: data.serviceName,
      url: data.url,
    });

    await this.emitter.invalidateRegistrationCache(data.serviceName);

    // Return signing_secret only this once — treat like a password
    return {
      id: registration.id,
      serviceName: registration.serviceName,
      url: registration.url,
      signingSecret,
      eventTypes: registration.eventTypes,
    };
  }

  /**
   * List all registrations (never return encryptedSigningSecret).
   */
  async list() {
    return this.db.webhookRegistration.findMany({
      select: {
        id: true,
        serviceName: true,
        url: true,
        eventTypes: true,
        active: true,
        failureCount: true,
        createdAt: true,
        disabledAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const reg = await this.db.webhookRegistration.findUnique({
      where: { id },
      select: {
        id: true,
        serviceName: true,
        url: true,
        eventTypes: true,
        active: true,
        failureCount: true,
        createdAt: true,
        disabledAt: true,
      },
    });
    if (!reg) throw new NotFoundException(ERR_WEBHOOK_REGISTRATION_NOT_FOUND);
    return reg;
  }

  /**
   * Update a registration (URL, event types). Cannot update signing secret — regenerate instead.
   */
  async update(
    id: string,
    data: { url?: string; eventTypes?: string[]; active?: boolean },
  ) {
    if (data.url) this.validateUrl(data.url);

    const updated = await this.db.webhookRegistration.update({
      where: { id },
      data: {
        ...(data.url && { url: data.url }),
        ...(data.eventTypes && { eventTypes: data.eventTypes }),
        ...(data.active !== undefined && {
          active: data.active,
          disabledAt: data.active ? null : new Date(),
        }),
      },
      select: {
        id: true,
        serviceName: true,
        url: true,
        eventTypes: true,
        active: true,
        failureCount: true,
      },
    });

    await this.emitter.invalidateRegistrationCache(updated.serviceName);
    return updated;
  }

  /**
   * Regenerate signing secret. Returns the new secret once.
   */
  async rotateSecret(id: string): Promise<{ signingSecret: string }> {
    const signingSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSigningSecret = encrypt(signingSecret);

    await this.db.webhookRegistration.update({
      where: { id },
      data: { encryptedSigningSecret },
    });

    return { signingSecret };
  }

  /**
   * Disable a registration (soft-delete).
   */
  async disable(id: string) {
    const reg = await this.db.webhookRegistration.update({
      where: { id },
      data: { active: false, disabledAt: new Date() },
    });

    await this.emitter.invalidateRegistrationCache(reg.serviceName);
    return reg;
  }

  /**
   * Decrypt and return the signing secret for delivery signing.
   * Internal only — never expose through API.
   */
  async getSigningSecret(id: string): Promise<string> {
    const reg = await this.db.webhookRegistration.findUniqueOrThrow({
      where: { id },
      select: { encryptedSigningSecret: true },
    });
    return decrypt(reg.encryptedSigningSecret);
  }

  /**
   * Get delivery history for a registration.
   */
  async getDeliveryHistory(registrationId: string, limit = 50) {
    return this.db.webhookDeliveryLog.findMany({
      where: { registrationId },
      select: {
        id: true,
        eventId: true,
        eventType: true,
        attemptNumber: true,
        status: true,
        httpStatusCode: true,
        responseBodyPreview: true,
        latencyMs: true,
        errorMessage: true,
        attemptedAt: true,
      },
      orderBy: { attemptedAt: 'desc' },
      take: limit,
    });
  }

  /** Reset failure count (e.g. after successful delivery). */
  async resetFailureCount(id: string) {
    await this.db.webhookRegistration.update({
      where: { id },
      data: { failureCount: 0 },
    });
  }

  /** Increment failure count and auto-disable at threshold. */
  async incrementFailureCount(id: string, maxFailures: number) {
    const reg = await this.db.webhookRegistration.update({
      where: { id },
      data: { failureCount: { increment: 1 } },
    });

    if (reg.failureCount >= maxFailures) {
      await this.db.webhookRegistration.update({
        where: { id },
        data: { active: false, disabledAt: new Date() },
      });

      await this.emitter.invalidateRegistrationCache(reg.serviceName);

      this.logger.error({
        msg: LOG_WEBHOOK_AUTO_DISABLED,
        registrationId: id,
        serviceName: reg.serviceName,
        failureCount: reg.failureCount,
        // TODO: Emit internal alert via email/Slack integration
      });
    }
  }

  // ─── Self-service (ownership-scoped) methods ───

  /**
   * List registrations belonging to a specific service.
   */
  async listByService(serviceName: string) {
    return this.db.webhookRegistration.findMany({
      where: { serviceName },
      select: {
        id: true,
        serviceName: true,
        url: true,
        eventTypes: true,
        active: true,
        failureCount: true,
        createdAt: true,
        disabledAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a registration by ID, but only if it belongs to the given service.
   */
  async getByIdForService(id: string, serviceName: string) {
    const reg = await this.db.webhookRegistration.findUnique({
      where: { id },
      select: {
        id: true,
        serviceName: true,
        url: true,
        eventTypes: true,
        active: true,
        failureCount: true,
        createdAt: true,
        disabledAt: true,
      },
    });
    if (!reg || reg.serviceName !== serviceName) {
      throw new NotFoundException(ERR_WEBHOOK_REGISTRATION_NOT_FOUND);
    }
    return reg;
  }

  /**
   * Get delivery history, but only for a registration owned by the given service.
   */
  async getDeliveryHistoryForService(
    registrationId: string,
    serviceName: string,
    limit = 50,
  ) {
    // Verify ownership first
    await this.getByIdForService(registrationId, serviceName);
    return this.getDeliveryHistory(registrationId, limit);
  }

  private validateUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException(ERR_INVALID_URL_FORMAT);
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(ERR_WEBHOOK_URL_MUST_USE_HTTPS);
    }

    // SSRF prevention: reject private/internal IP ranges
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      (net.isIP(hostname) && isPrivateIp(hostname))
    ) {
      throw new BadRequestException(ERR_WEBHOOK_URL_PRIVATE_ADDRESS);
    }
  }

  private async validateServiceName(serviceName: string): Promise<void> {
    const apiKey = await this.db.apiKey.findUnique({
      where: { systemName: serviceName, isActive: true },
    });
    if (!apiKey) {
      throw new BadRequestException(errWebhookServiceNameNotFound(serviceName));
    }
  }
}
