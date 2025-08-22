import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class RequestInterceptor implements NestInterceptor {
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

    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    console.log('URL -->', `${method} ${url}`);
    console.log('headers -->', mHeaders);
    console.log('body -->', mBody);
    console.log('query -->', mQuery);

    return next.handle();
  }
}
