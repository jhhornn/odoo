import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Enumeration of Odoo-specific error codes
 * Used for structured error handling and client-side error processing
 */
export enum OdooErrorCode {
  /** Authentication process failed */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  /** Invalid credentials provided */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  /** General API error */
  API_ERROR = 'API_ERROR',

  /** Connection to Odoo server failed */
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  /** Input validation failed */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /** Requested record not found */
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',

  /** Insufficient permissions */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/**
 * Custom exception for Odoo-related errors
 * Provides structured error information with error codes
 *
 * @remarks
 * This exception extends HttpException to integrate with NestJS
 * exception filters and provide consistent error responses.
 *
 * @example
 * ```typescript
 * throw new OdooException(
 *   OdooErrorCode.AUTHENTICATION_FAILED,
 *   'Invalid credentials provided',
 *   HttpStatus.UNAUTHORIZED
 * );
 * ```
 *
 * @public
 */
export class OdooException extends HttpException {
  /**
   * Create a new Odoo exception
   *
   * @param code - Error code from OdooErrorCode enum
   * @param message - Human-readable error message
   * @param status - HTTP status code
   * @param details - Additional error details (optional)
   */
  constructor(
    public readonly code: OdooErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super(
      {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }

  /**
   * Get the error code
   */
  getCode(): OdooErrorCode {
    return this.code;
  }

  /**
   * Get additional error details
   */
  getDetails(): any {
    return this.details;
  }

  /**
   * Check if error is of specific code
   */
  isCode(code: OdooErrorCode): boolean {
    return this.code === code;
  }
}
