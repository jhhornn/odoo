import * as xmlrpc from 'xmlrpc';
import { Injectable } from '@nestjs/common';
import { IOdooClient } from '../interfaces/odoo-client.interface';
import {
  ODOO_DEFAULT_TIMEOUT_MS,
  errOdooTimeout,
} from '../../common/constants';

export interface XmlRpcClientOptions {
  /** Reject a call that has not completed within this many milliseconds */
  timeoutMs?: number;
}

/** Error raised when an XML-RPC call exceeds its timeout */
export class OdooTimeoutError extends Error {
  readonly code = 'ODOO_TIMEOUT';

  constructor(readonly timeoutMs: number) {
    super(errOdooTimeout(timeoutMs));
    this.name = 'OdooTimeoutError';
  }
}

@Injectable()
export class XmlRpcClientFactory {
  createClient(
    url: string,
    path: string,
    options: XmlRpcClientOptions = {},
  ): IOdooClient {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : isHttps ? 443 : 80;
    // Keep any path prefix from the base URL (Odoo behind a reverse proxy)
    const basePath = parsedUrl.pathname.replace(/\/+$/, '');
    const clientOptions = {
      host: parsedUrl.hostname.replace(/^\[|\]$/g, ''),
      port,
      path: `${basePath}${path}`,
    };

    const client = isHttps
      ? xmlrpc.createSecureClient(clientOptions)
      : xmlrpc.createClient(clientOptions);
    const timeoutMs = options.timeoutMs ?? ODOO_DEFAULT_TIMEOUT_MS;

    const methodCall = (method: string, params: any[]): Promise<any> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new OdooTimeoutError(timeoutMs)),
          timeoutMs,
        );
        client.methodCall(method, params, (error: any, value: any) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve(value);
        });
      });

    return {
      methodCall,
      authenticate: (database, username, password) =>
        methodCall('authenticate', [database, username, password, {}]),
      execute: (database, uid, password, model, method, args, kwargs = {}) =>
        methodCall('execute_kw', [
          database,
          uid,
          password,
          model,
          method,
          args,
          kwargs,
        ]),
    };
  }
}
