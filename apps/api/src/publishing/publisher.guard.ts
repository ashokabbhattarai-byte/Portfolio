import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { fail, type PublisherRequest } from './common';
import { PublisherKeysService } from './publisher-keys.service';
import { PublisherRateService } from './publisher-rate.service';
import { SCOPE_KEY, type Scope } from './scopes';

/** Authenticates AI requests by API key and enforces the scope the route
 *  declares. Routes reached through this guard are marked @Public() so the
 *  global JWT guard stands aside — this is their only authentication. */
@Injectable()
export class PublisherGuard implements CanActivate {
  constructor(
    private readonly keys: PublisherKeysService,
    private readonly rate: PublisherRateService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PublisherRequest>();

    const header = request.headers.authorization ?? '';
    const [scheme, presented] = header.split(' ');
    if (!presented || scheme.toLowerCase() !== 'bearer') {
      fail(
        'INVALID_API_KEY',
        'Provide your key as: Authorization: Bearer pf_live_…',
        401,
      );
    }

    const key = await this.keys.authenticate(presented);

    /* Counted after authentication so an unauthenticated flood cannot consume
       a legitimate key's budget, and before the handler so an expensive
       upload is refused rather than performed and then rejected. */
    await this.rate.consume(key.id);

    const required = this.reflector.getAllAndOverride<Scope | undefined>(
      SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    /* No declared scope means the route was never meant to be reachable by
       key. Denying is the safe reading of a missing decorator. */
    if (!required) {
      fail('MISSING_SCOPE', 'This endpoint is not available to API keys.', 403);
    }
    if (!key.scopes.includes(required)) {
      fail(
        'MISSING_SCOPE',
        `This API key is missing the "${required}" scope.`,
        403,
      );
    }

    request.publisher = { id: key.id, scopes: key.scopes };
    request.correlationId =
      typeof request.headers['x-correlation-id'] === 'string'
        ? request.headers['x-correlation-id'].slice(0, 100)
        : randomUUID();
    return true;
  }
}
