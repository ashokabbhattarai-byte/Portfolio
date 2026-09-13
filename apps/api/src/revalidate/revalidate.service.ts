import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ContentTag } from '@portfolio/types';

const TIMEOUT_MS = 5_000;

@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  constructor(private readonly config: ConfigService) {}

  /* Deliberately not awaited by callers: the write already succeeded, and a
     Next app that is down or slow must not turn a 200 into a 500. Worst case
     the public site serves the previous copy until its own TTL lapses. */
  trigger(...tags: ContentTag[]): void {
    const secret = this.config.get<string>('REVALIDATE_SECRET');
    const webUrl = this.config.get<string>('WEB_URL');
    if (!secret || !webUrl) {
      this.logger.warn(
        `Revalidation skipped (${tags.join(', ')}): REVALIDATE_SECRET or WEB_URL unset.`,
      );
      return;
    }

    const url = `${webUrl.replace(/\/+$/, '')}/api/revalidate`;
    void fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
      .then((response) => {
        if (!response.ok) {
          this.logger.warn(
            `Revalidation of ${tags.join(', ')} returned ${response.status}.`,
          );
        }
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Revalidation of ${tags.join(', ')} failed: ${reason}`,
        );
      });
  }
}
