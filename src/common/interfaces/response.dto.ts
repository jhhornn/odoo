import { HttpStatus } from '@nestjs/common';
import { IResponseWrapper, ResponseMessage } from 'src/odoo/interfaces';

export class SuccessResponse implements IResponseWrapper {
  statusCode: number = HttpStatus.OK;
  message: string = ResponseMessage.SUCCESS;
}

export class SuccessCreatedResponse implements IResponseWrapper {
  statusCode: number = HttpStatus.CREATED;
  message: string = ResponseMessage.SUCCESS;
}

export class NotFoundResponse implements IResponseWrapper {
  statusCode: number = HttpStatus.NOT_FOUND;
  message: string = ResponseMessage.DATA_NOT_FOUND;
  error: string = 'Not Found';
}

import { ApiProperty } from '@nestjs/swagger';

export class IdResponseDto {
  @ApiProperty({ example: 123 })
  id: number;
}
