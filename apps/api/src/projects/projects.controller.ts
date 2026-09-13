import {
  Body,
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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async isAuthenticated(request: Request): Promise<boolean> {
    const token =
      (request.cookies?.[ACCESS_COOKIE] as string | undefined) ?? null;
    if (!token) return false;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, disabledAt: true },
      });
      return !!user && !user.disabledAt;
    } catch {
      return false;
    }
  }

  @Public()
  @Get()
  async list(
    @Req() request: Request,
    @Res({ passthrough: true }) res: import('express').Response,
  ) {
    const authed = await this.isAuthenticated(request);
    // Public hits are edge-cached; authed hits must not be cached publicly
    res.setHeader(
      'Cache-Control',
      authed
        ? 'private, max-age=0, must-revalidate'
        : 'public, s-maxage=60, stale-while-revalidate=120',
    );
    return this.projects.list(authed);
  }

  // Explicit admin listing, kept for admin-server that may want an unambiguous
  // authenticated response. The generic list above already upgrades to the full
  // set when a valid cookie is present, so this endpoint is strictly convenience.
  @Get('admin/list')
  @Roles('ADMIN', 'EDITOR')
  listAdmin() {
    return this.projects.list(true);
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
      authed
        ? 'private, max-age=0, must-revalidate'
        : 'public, s-maxage=60, stale-while-revalidate=120',
    );
    // Try slug first, then id — slugs are unique and human-friendly.
    try {
      return await this.projects.getBySlug(idOrSlug, authed);
    } catch {
      return this.projects.getById(idOrSlug, authed);
    }
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EDITOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.projects.remove(id);
  }
}
