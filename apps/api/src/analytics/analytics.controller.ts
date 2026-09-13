import { isUUID } from 'class-validator';
import { LikeDto } from './dto/like.dto';
import {
  Header,
  Headers,
  ForbiddenException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { TrackDto } from './dto/track.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('track')
  async track(@Body() dto: TrackDto, @Req() req: Request) {
    if (req.get('sec-fetch-site') === 'cross-site')
      return { ok: true, skipped: 'cross-site' };
    if (req.get('dnt') === '1' || req.get('sec-gpc') === '1')
      return { ok: true, skipped: 'privacy' };
    const token = req.cookies?.access_token;
    if (typeof token === 'string') {
      try {
        const payload = await new JwtService().verifyAsync<{ sub: string }>(
          token,
          { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') },
        );
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { disabledAt: true, role: true },
        });
        if (user && !user.disabledAt && ['ADMIN', 'EDITOR'].includes(user.role))
          return { ok: true, skipped: 'admin' };
      } catch {
        /* An expired cookie is not an authenticated editor. */
      }
    }
    return this.analytics.track({ ...dto, userAgent: req.get('user-agent') });
  }

  @Public()
  @Header('Cache-Control', 'no-store')
  @Get('views')
  views(
    @Query('path') path: string = '/',
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    return this.analytics.publicCount(
      path,
      visitorId && isUUID(visitorId, '4') ? visitorId : undefined,
    );
  }

  @Public()
  @Header('Cache-Control', 'no-store')
  @Get('blog-counts')
  blogCounts() {
    return this.analytics.blogCounts();
  }

  @Public()
  @Header('Cache-Control', 'no-store')
  @Post('like')
  like(@Body() dto: LikeDto, @Req() req: Request) {
    if (req.get('sec-fetch-site') === 'cross-site')
      throw new ForbiddenException();
    return this.analytics.setLike(dto);
  }

  @Header('Cache-Control', 'no-store')
  @Get('overview')
  @Roles('ADMIN', 'EDITOR')
  overview(@Query('days') days?: string) {
    return this.analytics.getOverview(days ?? '30');
  }

  @Header('Cache-Control', 'no-store')
  @Get('blogs')
  @Roles('ADMIN', 'EDITOR')
  blogs(@Query('days') days?: string) {
    return this.analytics.getAllBlogsAnalytics(days ?? 'all');
  }

  @Header('Cache-Control', 'no-store')
  @Get('blogs/:id')
  @Roles('ADMIN', 'EDITOR')
  blog(@Param('id') id: string, @Query('days') days?: string) {
    return this.analytics.getBlogAnalytics(id, days ?? '30');
  }

  @Header('Cache-Control', 'no-store')
  @Get('routes')
  @Roles('ADMIN', 'EDITOR')
  routes(@Query('days') days?: string) {
    return this.analytics.getAllRoutesAnalytics(days ?? '30');
  }

  @Header('Cache-Control', 'no-store')
  @Get('route')
  @Roles('ADMIN', 'EDITOR')
  route(@Query('path') path?: string, @Query('days') days?: string) {
    const p = path?.trim() ? (path.startsWith('/') ? path : `/${path}`) : '/';
    return this.analytics.getRouteAnalytics(p, days ?? '30');
  }
}
