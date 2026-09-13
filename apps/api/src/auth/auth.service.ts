import { randomBytes } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { AuthUser } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../prisma/prisma-client';
import { LoginDto } from './dto/login.dto';
import { TokensService } from './tokens.service';

/* OWASP's argon2id baseline: 19 MiB, three passes. Comfortably sub-100ms on a
   small VPS while staying expensive to attack offline. */
export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 3,
  parallelism: 1,
};

const LOCK_AFTER_FAILURES = 5;
const LOCK_BASE_MS = 60_000;
const LOCK_MAX_MS = 60 * 60_000;

export type RequestMeta = { ip?: string; userAgent?: string };

export type AuthResult = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /* Verified against on unknown emails so a miss costs the same as a wrong
     password and cannot be timed apart. */
  private readonly decoyHash: Promise<string> = argon2
    .hash(randomBytes(32).toString('base64'), ARGON2_OPTIONS)
    .catch(() => '');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  static toAuthUser(user: User): AuthUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      /* Distinct from the generic error on purpose: it is actionable, and a
         lockout is observable anyway. The throttler caps how fast anyone can
         provoke one. */
      throw new HttpException(
        'Too many failed sign-in attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verified = await argon2
      .verify(user?.passwordHash ?? (await this.decoyHash), dto.password)
      .catch(() => false);

    if (!user || !verified) {
      if (user) await this.recordFailure(user);
      throw this.invalidCredentials();
    }
    if (user.disabledAt) throw this.invalidCredentials();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const authUser = AuthService.toAuthUser(user);
    return {
      user: authUser,
      accessToken: this.tokens.signAccess(authUser),
      refreshToken: await this.startSession(user.id, meta),
    };
  }

  async refresh(
    presented: string | undefined,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    if (!presented) throw this.invalidSession();

    const session = await this.prisma.session.findUnique({
      where: { refreshHash: this.tokens.hashRefresh(presented) },
      include: { user: true },
    });
    if (!session) throw this.invalidSession();

    if (session.revokedAt) {
      /* The token was already rotated (or explicitly revoked) and has turned up
         again, which means a copy leaked. There is no way to tell the thief
         from the victim, so the whole family goes. */
      const revoked = await this.revokeAllSessions(session.userId);
      this.logger.warn(
        `Refresh token replay detected for user ${session.userId}; revoked ${revoked} live session(s).`,
      );
      throw this.invalidSession();
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw this.invalidSession();
    }

    if (session.user.disabledAt) {
      await this.revokeAllSessions(session.userId);
      throw this.invalidSession();
    }

    const next = this.tokens.mintRefresh();
    await this.prisma.$transaction(async (tx) => {
      /* Claim the old row first. If a concurrent refresh already took it the
         count is zero and this request loses rather than forking the family. */
      const claimed = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) throw this.invalidSession();

      const created = await tx.session.create({
        data: {
          userId: session.userId,
          refreshHash: next.hash,
          expiresAt: next.expiresAt,
          userAgent: meta.userAgent ?? null,
          ip: meta.ip ?? null,
        },
      });
      await tx.session.update({
        where: { id: session.id },
        data: { replacedById: created.id },
      });
    });

    const authUser = AuthService.toAuthUser(session.user);
    return {
      user: authUser,
      accessToken: this.tokens.signAccess(authUser),
      refreshToken: next.token,
    };
  }

  /** Revokes only the session the presented refresh token belongs to. */
  async logout(presented: string | undefined): Promise<void> {
    if (!presented) return;
    await this.prisma.session.updateMany({
      where: {
        refreshHash: this.tokens.hashRefresh(presented),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<{ revoked: number }> {
    return { revoked: await this.revokeAllSessions(userId) };
  }

  private async startSession(
    userId: string,
    meta: RequestMeta,
  ): Promise<string> {
    const minted = this.tokens.mintRefresh();
    await this.prisma.session.create({
      data: {
        userId,
        refreshHash: minted.hash,
        expiresAt: minted.expiresAt,
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
      },
    });
    return minted.token;
  }

  private async revokeAllSessions(userId: string): Promise<number> {
    const { count } = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count;
  }

  private async recordFailure(user: User): Promise<void> {
    const failedLogins = user.failedLogins + 1;
    const overage = failedLogins - LOCK_AFTER_FAILURES;
    const lockedUntil =
      overage >= 0
        ? new Date(
            Date.now() + Math.min(LOCK_BASE_MS * 2 ** overage, LOCK_MAX_MS),
          )
        : user.lockedUntil;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins, lockedUntil },
    });
  }

  /* One message for unknown email, wrong password and disabled account, so the
     response cannot be used to enumerate users. */
  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException('Invalid email or password.');
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException('Session expired. Sign in again.');
  }
}
