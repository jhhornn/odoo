import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ERR_INVALID_LIMIT, MAX_PAGE_LIMIT } from '../constants';

/**
 * Parses an optional `limit` query parameter and clamps it to
 * {@link MAX_PAGE_LIMIT}, so one request cannot pull an entire Odoo table.
 */
@Injectable()
export class ParseLimitPipe
  implements PipeTransform<unknown, number | undefined>
{
  transform(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) {
      throw new BadRequestException(ERR_INVALID_LIMIT);
    }
    return Math.min(n, MAX_PAGE_LIMIT);
  }
}
