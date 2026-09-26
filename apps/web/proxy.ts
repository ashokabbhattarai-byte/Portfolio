/**
 * Admin route guard.
 *
 * Next.js 16 deprecated `middleware.ts` and renamed the convention to
 * `proxy.ts` (same behaviour, new file and export name, Node.js runtime only).
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * THIS IS UX, NOT THE SECURITY BOUNDARY. It only decides whether to render the
 * CMS or bounce to the login screen, so an expired session lands on a form
 * instead of a wall of failed fetches. Every piece of admin data is fetched
 * from the NestJS API, which re-verifies the access cookie and the user's role
 * on every single request. A forged cookie that somehow satisfied this check
 * would still read and write nothing.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ACCESS_COOKIE_NAMES, LOGIN_PATH } from '@/lib/auth';

/* The API signs with a shared secret, so only the HMAC family is acceptable.
   Pinning this stops an "alg" swap from turning a public key into a
   verification key. */
const ALGORITHMS = ['HS256', 'HS384', 'HS512'];

let cachedSecret: { raw: string; key: Uint8Array } | null = null;
function secretKey(raw: string): Uint8Array {
  if (cachedSecret?.raw !== raw) {
    cachedSecret = { raw, key: new TextEncoder().encode(raw) };
  }
  return cachedSecret.key;
}

export async function proxy(request: NextRequest) {
  const secret = process.env.JWT_ACCESS_SECRET;
  const token = ACCESS_COOKIE_NAMES.map(
    (name) => request.cookies.get(name)?.value,
  ).find(Boolean);

  /* No secret configured means we cannot tell a real token from a forged one.
     Fail closed: send everyone to the login form rather than wave them past a
     check that is not actually running. */
  if (secret && token) {
    try {
      await jwtVerify(token, secretKey(secret), { algorithms: ALGORITHMS });
      return NextResponse.next();
    } catch {
      /* Expired, tampered with, or signed by something else. Same outcome. */
    }
  }

  const next = request.nextUrl.pathname + request.nextUrl.search;
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = '';
  if (next !== '/admin-252755') url.searchParams.set('next', next);
  const response = NextResponse.redirect(url);
  response.headers.set('cache-control', 'no-store');
  return response;
}

export const config = {
  /* Everything under /admin-252755 except the login screen itself, which has to stay
     reachable while signed out. The second pattern also excludes /admin-252755/login
     sub-paths without catching names that merely start with "login". */
  matcher: ['/admin-252755', '/admin-252755/((?!login$|login/).*)'],
};
