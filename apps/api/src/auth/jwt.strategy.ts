import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AuthUser } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_COOKIE } from './cookies';
import type { AccessPayload } from './tokens.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      /* Bearer headers are not accepted: the only client is the admin UI on the
         same origin, and cookie-only keeps the token out of JS. */
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          (request.cookies?.[ACCESS_COOKIE] as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /* Re-reads the user on every request so a disable or a role change takes
     effect without waiting for the access token to expire. */
  async validate(payload: AccessPayload): Promise<AuthUser> {
    const user = await this.prisma.authUser(payload.sub);
    if (!user || user.disabledAt)
      throw new UnauthorizedException('Session is no longer valid.');
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
