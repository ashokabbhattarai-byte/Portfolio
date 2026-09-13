#!/usr/bin/env node
/**
 * MCP server for the portfolio's AI publishing API.
 *
 * Launched by the MCP client (Claude Desktop, Claude Code, Codex, Cursor) over
 * stdio — it is not a dev server and is deliberately absent from `turbo run
 * dev`. It holds no business logic: every tool is a request to /api/v1/ai,
 * which enforces scopes, validation and auditing.
 *
 *   PORTFOLIO_API_URL=https://your-api.example.com
 *   PORTFOLIO_API_KEY=pf_live_…
 *
 * PORTFOLIO_API_KEY is issued by *this* portfolio, in Admin → AI keys. It is
 * not an OpenAI or Anthropic key: no AI provider credential is involved
 * anywhere in this server. The assistant supplies the writing; the key only
 * says what it is allowed to do here.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PortfolioApiError, PortfolioClient } from './client.js';
import { tools } from './tools.js';
const API_URL = process.env.PORTFOLIO_API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.PORTFOLIO_API_KEY ?? '';
if (!API_KEY) {
    /* stderr, never stdout: stdout is the MCP transport and any stray byte
       there corrupts the protocol stream. */
    process.stderr.write('PORTFOLIO_API_KEY is not set.\n\n' +
        'This is your own portfolio key, not an OpenAI or Anthropic key:\n' +
        '  1. open the admin at /admin/ai/api-keys\n' +
        '  2. create a key and copy it (it is shown once)\n' +
        '  3. put it in the "env" block of your MCP client config\n\n' +
        'This server is started by an MCP client, not by hand — see ' +
        'docs/ai-publishing.md for the config snippet.\n');
    process.exit(1);
}
const client = new PortfolioClient(API_URL, API_KEY);
const server = new McpServer({
    name: 'portfolio-publishing',
    version: '0.1.0',
});
for (const tool of tools) {
    /* The SDK infers a callback signature from the raw shape. Inferring across
       eleven tools at once trips TS2589, and the shape is dynamic here anyway,
       so the registration is widened once rather than per tool. */
    const register = server.registerTool.bind(server);
    register(tool.name, {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.schema,
    }, async (args) => {
        try {
            const result = await tool.run(client, args);
            return {
                content: [
                    { type: 'text', text: JSON.stringify(result, null, 2) },
                ],
            };
        }
        catch (error) {
            /* Returned as an error result rather than thrown, so the model reads
               the code and can correct itself — a MISSING_SCOPE is actionable
               information, not a transport failure. */
            const message = error instanceof PortfolioApiError
                ? `${error.code}: ${error.message}`
                : error instanceof Error
                    ? error.message
                    : 'The request failed.';
            return {
                isError: true,
                content: [{ type: 'text', text: message }],
            };
        }
    });
}
async function main() {
    await server.connect(new StdioServerTransport());
    process.stderr.write(`portfolio-mcp ready — ${tools.length} tools against ${API_URL}\n`);
}
main().catch((error) => {
    process.stderr.write(`portfolio-mcp failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map