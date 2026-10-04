import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ODOO_API_MODULE_OPTIONS,
  ERR_INVALID_MODEL_NAME,
  errModelNotAllowed,
} from '../../common/constants';
import { OdooApiModuleOptions } from '../interfaces/odoo-module-options.interface';

/** Technical Odoo model names: `res.partner`, `account.move.line`, ... */
export const ODOO_MODEL_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

/**
 * Enforces the `OdooApiModule` policy on the generic routes:
 * required scopes, model-name syntax, and the optional model allowlist.
 * Must run after `ApiKeyGuard` so the caller's scopes are known.
 */
@Injectable()
export class OdooModelAccessGuard implements CanActivate {
  private readonly allowedModels?: ReadonlySet<string>;

  constructor(
    @Inject(ODOO_API_MODULE_OPTIONS)
    private readonly options: OdooApiModuleOptions,
  ) {
    this.allowedModels = options.allowedModels
      ? new Set(options.allowedModels)
      : undefined;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const requiredScopes = this.options.requiredScopes ?? [];
    const granted: string[] = request.apiKeyContext?.scopes ?? [];
    if (!requiredScopes.every((scope) => granted.includes(scope))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const model = request.params?.model ?? request.query?.model;
    if (model === undefined) return true;

    if (
      typeof model !== 'string' ||
      model.length > 128 ||
      !ODOO_MODEL_NAME_PATTERN.test(model)
    ) {
      throw new BadRequestException(ERR_INVALID_MODEL_NAME);
    }
    if (!this.isModelAllowed(model)) {
      throw new ForbiddenException(errModelNotAllowed(model));
    }
    return true;
  }

  isModelAllowed(model: string): boolean {
    return !this.allowedModels || this.allowedModels.has(model);
  }
}
