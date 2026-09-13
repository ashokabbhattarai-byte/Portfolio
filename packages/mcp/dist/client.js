/**
 * Thin HTTP client for the portfolio's AI API.
 *
 * Every tool in this server is a call through here — the MCP layer holds no
 * publishing logic of its own, so scope checks, validation, slug rules and
 * auditing are whatever the server says they are.
 */
export class PortfolioApiError extends Error {
    code;
    status;
    constructor(code, message, status) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'PortfolioApiError';
    }
}
function readError(status, body) {
    if (body && typeof body === 'object') {
        const envelope = body.error;
        if (envelope?.code) {
            return new PortfolioApiError(envelope.code, envelope.message ?? 'The request failed.', status);
        }
        const message = body.message;
        if (typeof message === 'string') {
            return new PortfolioApiError('REQUEST_FAILED', message, status);
        }
        if (Array.isArray(message)) {
            /* class-validator returns an array of constraint strings. */
            return new PortfolioApiError('VALIDATION_FAILED', message.filter((m) => typeof m === 'string').join('. '), status);
        }
    }
    return new PortfolioApiError('REQUEST_FAILED', `Request failed (${status}).`, status);
}
export class PortfolioClient {
    apiKey;
    base;
    constructor(baseUrl, apiKey) {
        this.apiKey = apiKey;
        this.base = `${baseUrl.replace(/\/+$/, '')}/api/v1/ai`;
    }
    async send(path, init = {}) {
        const { query, ...rest } = init;
        const url = new URL(`${this.base}${path}`);
        for (const [key, value] of Object.entries(query ?? {})) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        }
        let response;
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
        }
        catch {
            throw new PortfolioApiError('API_UNREACHABLE', `Could not reach the portfolio API at ${this.base}. Check PORTFOLIO_API_URL and that the server is running.`, 0);
        }
        const text = await response.text();
        const body = text
            ? (() => {
                try {
                    return JSON.parse(text);
                }
                catch {
                    return text;
                }
            })()
            : null;
        if (!response.ok)
            throw readError(response.status, body);
        return body;
    }
    get(path, query) {
        return this.send(path, { method: 'GET', query });
    }
    post(path, body) {
        return this.send(path, {
            method: 'POST',
            body: JSON.stringify(body ?? {}),
        });
    }
    patch(path, body) {
        return this.send(path, { method: 'PATCH', body: JSON.stringify(body) });
    }
    delete(path) {
        return this.send(path, { method: 'DELETE' });
    }
}
//# sourceMappingURL=client.js.map