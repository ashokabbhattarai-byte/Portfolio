import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { Public } from '../common/decorators/public.decorator';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /** Grouped fetch: one round trip for the whole public site. Sends ETag + Cache-Control */
  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  async get(
    @Query('only') only: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.content.getSiteContent(only);
    const body = JSON.stringify(data);
    const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).send();
      return;
    }
    return data;
  }

  /** Lightweight health / version for TanStack prefetch warming */
  @Public()
  @Get('meta')
  async meta() {
    return this.content.getMeta();
  }
}
