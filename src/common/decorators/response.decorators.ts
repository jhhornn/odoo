import { SetMetadata } from '@nestjs/common';
import { API_RESPONSE_META } from '../constants';
export { API_RESPONSE_META } from '../constants';

export interface ApiResponseMetaOptions {
  message?: string;
  statusCode?: number;
  passthrough?: boolean;
}

export const ApiResponseMeta = (options: ApiResponseMetaOptions) =>
  SetMetadata(API_RESPONSE_META, options);
