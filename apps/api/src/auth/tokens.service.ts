import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '@portfolio/types';
import { parseDuration } from '../common/duration';

const REFRESH_TOKEN_BYTES = 48;

export type AccessPayload = {
  sub: string;
  email: string;
  role: AuthUser['role'];
};

export type MintedRefresh = {
  token: string;
  hash: string;
  expiresAt: Date;
};

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  get accessMaxAge(): number {
    return parseDuration(this.config.get<string>('ACCESS_TOKEN_TTL'), '15m');
  }

  get refreshMaxAge(): number {
    return parseDuration(this.config.get<string>('REFRESH_TOKEN_TTL'), '30d');
  }

  signAccess(user: AuthUser): string {
    const payload: AccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.sign(payload, {
      expiresIn: Math.floor(this.accessMaxAge / 1000),
    });
  }

  mintRefresh(): MintedRefresh {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    return {
      token,
      hash: this.hashRefresh(token),
      expiresAt: new Date(Date.now() + this.refreshMaxAge),
    };
  }

  /* Keyed rather than plain SHA-256: the column is unique so the hash has to be
     deterministic for lookup, and the key means a dumped sessions table cannot
     be brute-forced back into live tokens. */
  hashRefresh(token: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update(token)
      .digest('hex');
  }
}
