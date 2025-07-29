import * as xmlrpc from 'xmlrpc';
import { Injectable } from '@nestjs/common';
import { IOdooClient } from '../interfaces/odoo-client.interface';

@Injectable()
export class XmlRpcClientFactory {
  createClient(url: string, path: string): IOdooClient {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : isHttps ? 443 : 80;

    const client = isHttps
      ? xmlrpc.createSecureClient({
          host: parsedUrl.hostname,
          port: port,
          path,
        })
      : xmlrpc.createClient({
          host: parsedUrl.hostname,
          port: port,
          path,
        });

    return {
      methodCall: (method: string, params: any[]): Promise<any> => {
        return new Promise((resolve, reject) => {
          client.methodCall(method, params, (error: any, value: any) => {
            if (error) reject(error);
            else resolve(value);
          });
        });
      },
      authenticate: async (
        database: string,
        username: string,
        password: string,
      ): Promise<number> => {
        return this.methodCall(client, 'authenticate', [
          database,
          username,
          password,
          {},
        ]);
      },
      execute: async (
        database: string,
        uid: number,
        password: string,
        model: string,
        method: string,
        args: any[],
        kwargs: any = {},
      ): Promise<any> => {
        return this.methodCall(client, 'execute_kw', [
          database,
          uid,
          password,
          model,
          method,
          args,
          kwargs,
        ]);
      },
    };
  }

  private methodCall(client: any, method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      client.methodCall(method, params, (error: any, value: any) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  }
}
