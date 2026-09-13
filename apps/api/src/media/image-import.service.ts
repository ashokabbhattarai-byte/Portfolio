import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { fail } from '../publishing/common';
import { MAX_IMAGE_BYTES } from './image-pipeline';

/* Fetching a URL an AI agent chose is a server-side request to an attacker-
   influenced address, so every hop is treated as hostile: scheme allow-list,
   DNS resolved and checked before connecting, redirects followed by hand with
   the same checks, and the body capped while it streams rather than after. */

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

/** RFC 1918 and friends, plus the cloud metadata endpoints that make SSRF
 *  worth attempting in the first place. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const value = ip.toLowerCase();
    if (value === '::' || value === '::1') return true;
    // Unique-local (fc00::/7) and link-local (fe80::/10).
    if (/^f[cd]/.test(value) || /^fe[89ab]/.test(value)) return true;
    // ::ffff:a.b.c.d maps IPv4 into v6; unwrap and re-check.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

export interface ImportedImage {
  bytes: Buffer;
  filename: string;
  sourceUrl: string;
}

@Injectable()
export class ImageImportService {
  private readonly logger = new Logger(ImageImportService.name);

  /** Resolves the host and refuses anything that points inside the network.
   *  Returning the address lets the caller pin it, closing the DNS-rebinding
   *  window between this check and the socket actually connecting. */
  private async assertPublicHost(hostname: string): Promise<void> {
    const literal = isIP(hostname);
    if (literal) {
      if (isPrivateAddress(hostname)) {
        fail('UNSAFE_IMAGE_URL', 'That address is not publicly routable.', 400);
      }
      return;
    }
    let records: { address: string }[];
    try {
      records = await lookup(hostname, { all: true });
    } catch {
      fail('IMAGE_FETCH_FAILED', 'The image host could not be resolved.', 400);
    }
    if (
      records.length === 0 ||
      records.some((r) => isPrivateAddress(r.address))
    ) {
      fail('UNSAFE_IMAGE_URL', 'That address is not publicly routable.', 400);
    }
  }

  private parse(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      fail('UNSAFE_IMAGE_URL', 'Provide an absolute http(s) image URL.', 400);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      fail(
        'UNSAFE_IMAGE_URL',
        'Only http and https image URLs are supported.',
        400,
      );
    }
    if (url.username || url.password) {
      fail(
        'UNSAFE_IMAGE_URL',
        'Credentials in the image URL are not accepted.',
        400,
      );
    }
    return url;
  }

  /** Streams the body with a hard cap so a hostile server cannot exhaust
   *  memory by advertising a small Content-Length and then sending gigabytes. */
  private async read(response: Response): Promise<Buffer> {
    const declared = Number(response.headers.get('content-length') ?? '');
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      fail('IMAGE_TOO_LARGE', 'That image is larger than 8 MiB.', 413);
    }
    const reader = response.body?.getReader();
    if (!reader)
      fail('IMAGE_FETCH_FAILED', 'The image could not be downloaded.', 400);
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          fail('IMAGE_TOO_LARGE', 'That image is larger than 8 MiB.', 413);
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    return Buffer.concat(chunks, total);
  }

  async fetchImage(rawUrl: string): Promise<ImportedImage> {
    let url = this.parse(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      for (let hop = 0; ; hop += 1) {
        await this.assertPublicHost(url.hostname);
        const response = await fetch(url, {
          redirect: 'manual',
          signal: controller.signal,
          headers: { accept: 'image/*' },
        }).catch(() =>
          fail('IMAGE_FETCH_FAILED', 'The image could not be downloaded.', 400),
        );

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location || hop >= MAX_REDIRECTS) {
            fail(
              'IMAGE_FETCH_FAILED',
              'The image URL redirected too many times.',
              400,
            );
          }
          /* Re-parsed and re-validated on the next pass, so a redirect into
             169.254.169.254 is rejected exactly like a direct request. */
          url = this.parse(new URL(location, url).toString());
          continue;
        }
        if (!response.ok) {
          fail(
            'IMAGE_FETCH_FAILED',
            `The image host returned ${response.status}.`,
            400,
          );
        }

        const contentType = (response.headers.get('content-type') ?? '')
          .split(';')[0]
          .trim();
        if (contentType && !contentType.startsWith('image/')) {
          fail(
            'UNSUPPORTED_FILE_TYPE',
            `Expected an image, received ${contentType}.`,
            400,
          );
        }
        const bytes = await this.read(response);
        const name =
          decodeURIComponent(url.pathname.split('/').pop() ?? '') || 'imported';
        return {
          bytes,
          filename: name.slice(0, 200),
          sourceUrl: url.toString(),
        };
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
