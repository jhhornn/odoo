import * as https from 'https';
import { safeLookup } from '../../common/security/ssrf.util';

export interface WebhookHttpResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** Error raised when a delivery exceeds its timeout */
export class WebhookTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Timeout after ${timeoutMs}ms`);
    this.name = 'AbortError';
  }
}

/**
 * POST a webhook payload over HTTPS with SSRF protections:
 * - every resolved address is checked at connect time (`safeLookup`),
 * - redirects are never followed (a 3xx is returned as a failed delivery),
 * - the response body is capped at `maxBodyBytes`.
 */
export function postWebhook(
  url: string,
  body: string,
  headers: Record<string, string>,
  {
    timeoutMs,
    maxBodyBytes = 64 * 1024,
  }: { timeoutMs: number; maxBodyBytes?: number },
): Promise<WebhookHttpResponse> {
  const target = new URL(url);
  if (target.protocol !== 'https:') {
    return Promise.reject(new Error('Webhook URLs must use HTTPS'));
  }

  return new Promise((resolve, reject) => {
    const request = https.request(
      target,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        lookup: safeLookup,
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let received = 0;
        response.on('data', (chunk: Buffer) => {
          if (received < maxBodyBytes) chunks.push(chunk);
          received += chunk.length;
        });
        response.on('end', () => {
          const status = response.statusCode ?? 0;
          resolve({
            status,
            ok: status >= 200 && status < 300,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8').slice(0, maxBodyBytes),
          });
        });
        response.on('error', reject);
      },
    );

    // Hard deadline for the whole exchange, not just socket idle time
    const deadline = setTimeout(
      () => request.destroy(new WebhookTimeoutError(timeoutMs)),
      timeoutMs,
    );
    request.on('timeout', () =>
      request.destroy(new WebhookTimeoutError(timeoutMs)),
    );
    request.on('error', reject);
    request.on('close', () => clearTimeout(deadline));
    request.end(body);
  });
}
