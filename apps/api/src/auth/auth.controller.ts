import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthUser } from '@portfolio/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthResult, AuthService, RequestMeta } from './auth.service';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAccessCookie,
  setRefreshCookie,
} from './cookies';
import { LoginDto } from './dto/login.dto';
import { TokensService } from './tokens.service';

const USER_AGENT_MAX = 255;

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const result = await this.auth.login(dto, meta(request));
    this.issue(response, result);
    return result.user;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    try {
      const result = await this.auth.refresh(
        refreshCookie(request),
        meta(request),
      );
      this.issue(response, result);
      return result.user;
    } catch (error) {
      /* A rejected refresh always ends with the browser holding nothing, so a
         replayed or expired token cannot be retried. */
      clearAuthCookies(response, this.config);
      throw error;
    }
  }

  /* Public so an expired access token still lets the browser clean up. */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(refreshCookie(request));
    clearAuthCookies(response, this.config);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ revoked: number }> {
    const result = await this.auth.logoutAll(user.id);
    clearAuthCookies(response, this.config);
    return result;
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private issue(response: Response, result: AuthResult): void {
    setAccessCookie(
      response,
      this.config,
      result.accessToken,
      this.tokens.accessMaxAge,
    );
    setRefreshCookie(
      response,
      this.config,
      result.refreshToken,
      this.tokens.refreshMaxAge,
    );
  }
}

function refreshCookie(request: Request): string | undefined {
  return request.cookies?.[REFRESH_COOKIE] as string | undefined;
}

function meta(request: Request): RequestMeta {
  return {
    ip: request.ip,
    userAgent: request.get('user-agent')?.slice(0, USER_AGENT_MAX),
  };
}
