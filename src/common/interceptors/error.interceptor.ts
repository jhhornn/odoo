import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const response =
          error instanceof HttpException
            ? error.getResponse()
            : {
                statusCode: status,
                message: 'Internal server error',
                error: error.message,
              };

        const standardizedResponse =
          typeof response === 'object' && response !== null
            ? {
                statusCode: status,
                ...response,
                timestamp: new Date().toISOString(),
              }
            : {
                statusCode: status,
                message: response,
                timestamp: new Date().toISOString(),
              };

        return throwError(
          () => new HttpException(standardizedResponse, status),
        );
      }),
    );
  }
}
