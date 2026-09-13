/**
 * Thin HTTP client for the portfolio's AI API.
 *
 * Every tool in this server is a call through here — the MCP layer holds no
 * publishing logic of its own, so scope checks, validation, slug rules and
 * auditing are whatever the server says they are.
 */

export interface ApiFailure {
  code: string;
  message: string;
}

export class PortfolioApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PortfolioApiError';
  }
}

function readError(status: number, body: unknown): PortfolioApiError {
  if (body && typeof body === 'object') {
    const envelope = (body as { error?: Partial<ApiFailure> }).error;
    if (envelope?.code) {
      return new PortfolioApiError(
        envelope.code,
        envelope.message ?? 'The request failed.',
        status,
      );
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') {
      return new PortfolioApiError('REQUEST_FAILED', message, status);
    }
    if (Array.isArray(message)) {
      /* class-validator returns an array of constraint strings. */
      return new PortfolioApiError(
        'VALIDATION_FAILED',
        message.filter((m) => typeof m === 'string').join('. '),
        status,
      );
    }
  }
  return new PortfolioApiError(
    'REQUEST_FAILED',
    `Request failed (${status}).`,
    status,
  );
}

export class PortfolioClient {
  private readonly base: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.base = `${baseUrl.replace(/\/+$/, '')}/api/v1/ai`;
  }

  private async send<T>(
    path: string,
    init: RequestInit & { query?: Record<string, unknown> } = {},
  ): Promise<T> {
    const { query, ...rest } = init;
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...rest,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          accept: 'application/json',
          ...(rest.body instanceof FormData
            ? {}
            : { 'content-type': 'application/json' }),
          ...(rest.headers ?? {}),
        },
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      throw new PortfolioApiError(
        'API_UNREACHABLE',
        `Could not reach the portfolio API at ${this.base}. Check PORTFOLIO_API_URL and that the server is running.`,
        0,
      );
    }

    const text = await response.text();
    const body: unknown = text
      ? ((): unknown => {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        })()
      : null;

    if (!response.ok) throw readError(response.status, body);
    return body as T;
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.send<T>(path, { method: 'GET', query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<T> {
    return this.send<T>(path, { method: 'DELETE' });
  }
}
