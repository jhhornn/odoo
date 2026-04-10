import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

const errorSchema = (statusCode: number, message: string) => ({
  properties: {
    statusCode: { type: 'number', example: statusCode },
    message: { type: 'string', example: message },
    error: { type: 'string' },
    timestamp: { type: 'string', example: '2026-04-08T12:00:00.000Z' },
  },
});

export const ApiCommonErrorResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Validation error or bad request',
      schema: errorSchema(400, 'Bad Request'),
    }),
    ApiResponse({
      status: 401,
      description: 'Missing or invalid API key',
      schema: errorSchema(401, 'Unauthorized'),
    }),
    ApiResponse({
      status: 404,
      description: 'Record not found',
      schema: errorSchema(404, 'Not Found'),
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error (e.g. Odoo XML-RPC failure)',
      schema: errorSchema(500, 'Internal server error'),
    }),
  );
