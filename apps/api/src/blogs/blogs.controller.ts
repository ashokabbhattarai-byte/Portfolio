import { actorFrom, type PublisherRequest } from '../publishing/common';
import { PageQuery } from '../publishing/query.dto';
import {
  Body,
  Query,
  Header,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_COOKIE } from '../auth/cookies';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogsService } from './blogs.service';

@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly blogs: BlogsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async isAuthenticated(request: Request): Promise<boolean> {
    const token =
      (request.cookies?.[ACCESS_COOKIE] as string | undefined) ?? null;
    if (!token) return false;
    let payload: { sub: string };
    try {
      payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      return false;
    }
    // A database failure is not evidence of an anonymous request.
    const user = await this.prisma.authUser(payload.sub);
    return !!user && !user.disabledAt;
  }

  @Public()
  @Get()
  async list(
    @Req() request: Request,
    @Res({ passthrough: true }) res: import('express').Response,
  ) {
    const authed = await this.isAuthenticated(request);
    res.setHeader(
      'Cache-Control',
      authed ? 'private, max-age=0, must-revalidate' : 'no-store',
    );
    return this.blogs.list(authed);
  }

  @Get('admin/list')
  @Roles('ADMIN', 'EDITOR')
  listAdmin() {
    return this.blogs.list(true);
  }

  @Get('admin/search')
  @Roles('ADMIN', 'EDITOR')
  search(@Query() query: PageQuery) {
    return this.blogs.search(query);
  }

  @Public()
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Get('preview/:token')
  previewContent(@Param('token') token: string) {
    return this.blogs.readPreview(token);
  }

  @Post(':id/preview')
  @Roles('ADMIN', 'EDITOR')
  preview(@Param('id') id: string, @Req() req: PublisherRequest) {
    return this.blogs.preview(id, actorFrom(req));
  }
  @Post(':id/duplicate')
  @Roles('ADMIN', 'EDITOR')
  duplicate(@Param('id') id: string, @Req() req: PublisherRequest) {
    return this.blogs.duplicate(id, actorFrom(req));
  }
  @Get(':id/revisions')
  @Roles('ADMIN', 'EDITOR')
  revisions(@Param('id') id: string) {
    return this.blogs.revisions(id);
  }
  @Post(':id/revisions/:revisionId/restore')
  @Roles('ADMIN', 'EDITOR')
  restore(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: PublisherRequest,
  ) {
    return this.blogs.restore(id, revisionId, actorFrom(req));
  }

  @Public()
  @Get(':idOrSlug')
  async getOne(
    @Param('idOrSlug') idOrSlug: string,
    @Req() request: Request,
    @Res({ passthrough: true }) res: import('express').Response,
  ) {
    const authed = await this.isAuthenticated(request);
    res.setHeader(
      'Cache-Control',
      authed ? 'private, max-age=0, must-revalidate' : 'no-store',
    );
    try {
      return await this.blogs.getBySlug(idOrSlug, authed);
    } catch {
      return this.blogs.getById(idOrSlug, authed);
    }
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateBlogDto, @Req() req: PublisherRequest) {
    return this.blogs.create(dto, actorFrom(req));
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @Req() req: PublisherRequest,
  ) {
    return this.blogs.update(id, dto, actorFrom(req));
  }

  @Delete(':id')
  @Roles('ADMIN', 'EDITOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: PublisherRequest,
  ): Promise<void> {
    await this.blogs.remove(id, actorFrom(req));
  }
}
