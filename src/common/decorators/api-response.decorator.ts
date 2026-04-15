import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseMessage } from '../../odoo/interfaces';

export const ApiStandardResponse = <TModel extends Type<any>>(options?: {
  type?: TModel | TModel[];
  description?: string;
  status?: number;
}) => {
  const { type, description, status = 200 } = options || {};

  return applyDecorators(
    ApiExtraModels(...(type ? (Array.isArray(type) ? type : [type]) : [])),
    ApiResponse({
      description: description || 'Request Successful',
      status: status,
      schema: {
        properties: {
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: ResponseMessage.SUCCESS },
          data: type
            ? Array.isArray(type)
              ? {
                  type: 'array',
                  items: { $ref: getSchemaPath(type[0]) },
                }
              : {
                  $ref: getSchemaPath(type),
                }
            : { type: 'object' },
        },
      },
    }),
  );
};
