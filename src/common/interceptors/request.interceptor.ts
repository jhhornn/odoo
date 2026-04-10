import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const { method, url, headers, query, body } = context
      .switchToHttp()
      .getRequest<Request>();

    const mQuery = { ...query };
    const mHeaders = { ...headers };
    const mBody = { ...body };

    delete mQuery.token;
    delete mQuery.access_token;
    delete mHeaders.authorization;
    delete mBody.password;

    this.logger.debug(`${method} ${url}`);

    return next.handle();
  }
}
