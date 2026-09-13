import type { CookieOptions, Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/* The refresh cookie is only ever presented to /api/auth/{refresh,logout},
   so it is scoped there and never rides along on ordinary content requests. */
export const REFRESH_COOKIE_PATH = '/api/auth';

function base(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.get<string>('NODE_ENV') !== 'development',
  };
}

export function setAccessCookie(
  res: Response,
  config: ConfigService,
  token: string,
  maxAge: number,
): void {
  res.cookie(ACCESS_COOKIE, token, { ...base(config), path: '/', maxAge });
}

export function setRefreshCookie(
  res: Response,
  config: ConfigService,
  token: string,
  maxAge: number,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...base(config),
    path: REFRESH_COOKIE_PATH,
    maxAge,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  res.clearCookie(ACCESS_COOKIE, { ...base(config), path: '/' });
  res.clearCookie(REFRESH_COOKIE, {
    ...base(config),
    path: REFRESH_COOKIE_PATH,
  });
}
