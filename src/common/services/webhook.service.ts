import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyContext } from '../../auth/interfaces';

export interface WebhookPayload {
  event: string;
  status: 'success' | 'error';
  model: string;
  externalRef?: string;
  partnerId?: number;
  productId?: number;
  invoiceId?: number;
  paymentId?: number;
  companyId: number;
  data?: Record<string, any>;
  error?: string;
  timestamp: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async notify(
    context: ApiKeyContext,
    payload: Omit<WebhookPayload, 'timestamp' | 'companyId'>,
  ): Promise<void> {
    if (!context.webhookUrl) {
      return;
    }

    const fullPayload: WebhookPayload = {
      ...payload,
      companyId: context.companyId,
      timestamp: new Date().toISOString(),
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (context.webhookToken) {
        headers['X-Webhook-Token'] = context.webhookToken;
      }

      const response = await fetch(context.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(fullPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Webhook delivery failed to ${context.webhookUrl}: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.log(
          `Webhook delivered to ${context.systemName}: ${payload.event}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Webhook delivery error to ${context.webhookUrl}: ${error.message}`,
      );
    }
  }
}
