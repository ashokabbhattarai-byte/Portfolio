import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from './prisma-client';
import { databaseErrorCode, isDatabaseUnavailable } from './database-errors';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    // Express's matched route is a template (e.g. /blogs/:id), not the
    // requested URL. Never fall back to originalUrl, params, or query strings.
    const route: unknown = request.route?.path;
    const endpoint = typeof route === 'string' ? route : 'unmatched';
    const method = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS',
    ].includes(request.method)
      ? request.method
      : 'unknown';
    const unavailable = isDatabaseUnavailable(error);
    const status = unavailable ? 503 : 500;
    const requestId = randomUUID();
    const code = unavailable
      ? 'DATABASE_UNAVAILABLE'
      : 'DATABASE_OPERATION_FAILED';
    const message = unavailable
      ? 'The service is temporarily unavailable. Please retry shortly.'
      : 'The operation could not be completed.';
    // Never log Prisma's verbose query, parameters, connection address, or stack.
    this.logger.error(
      `${code} code=${databaseErrorCode(error) ?? 'unknown'} method=${method} route=${endpoint} requestId=${requestId}`,
    );
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Request-Id', requestId);
    if (unavailable) response.setHeader('Retry-After', '3');
    response.status(status).json({
      statusCode: status,
      message,
      error: { code, message },
      requestId,
    });
  }
}
