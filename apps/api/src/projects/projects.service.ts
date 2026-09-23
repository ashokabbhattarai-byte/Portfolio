import { AdminPageQuery, pageOrder } from '../common/admin-page.dto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { Project } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

type PrismaCategory = 'AI' | 'FULL_STACK' | 'BLOCKCHAIN';

function toPrismaCategory(value: Project['category']): PrismaCategory {
  if (value === 'AI') return 'AI';
  if (value === 'Full stack') return 'FULL_STACK';
  return 'BLOCKCHAIN';
}

function toWireCategory(value: string): Project['category'] {
  if (value === 'AI') return 'AI';
  if (value === 'FULL_STACK') return 'Full stack';
  return 'Blockchain';
}

function toWire(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    category: toWireCategory(row.category as string),
    role: row.role as string,
    context: row.context as string,
    summary: row.summary as string,
    color: row.color as string,
    ink: row.ink as string,
    symbol: row.symbol as string,
    live: (row.live as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    gallery: (row.gallery as string | null) ?? null,
    overview: row.overview as string,
    challenge: row.challenge as string,
    contribution: row.contribution as string,
    outcome: row.outcome as string,
    focus: (row.focus as string[]) ?? [],
    features: (row.features as string[]) ?? [],
    published: row.published as boolean,
    featured: row.featured as boolean,
    position: row.position as number,
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async search(q: AdminPageQuery) {
    const where = q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: 'insensitive' as const } },
            { slug: { contains: q.search, mode: 'insensitive' as const } },
            { summary: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: pageOrder(q),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return {
      items: rows.map((row) =>
        toWire(row as unknown as Record<string, unknown>),
      ),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  async list(admin = false): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({
      where: admin ? {} : { published: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => toWire(r as unknown as Record<string, unknown>));
  }

  async listPublic(): Promise<Project[]> {
    return this.list(false);
  }

  async getById(id: string, includeDrafts = false): Promise<Project> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Project not found.');
    if (!includeDrafts && !row.published)
      throw new NotFoundException('Project not found.');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async getBySlug(slug: string, includeDrafts = false): Promise<Project> {
    const row = await this.prisma.project.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Project not found.');
    if (!includeDrafts && !row.published)
      throw new NotFoundException('Project not found.');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    try {
      const row = await this.prisma.project.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          category: toPrismaCategory(dto.category),
          role: dto.role,
          context: dto.context,
          summary: dto.summary,
          color: dto.color,
          ink: dto.ink,
          symbol: dto.symbol,
          live: dto.live ?? null,
          image: dto.image ?? null,
          gallery: dto.gallery ?? null,
          overview: dto.overview,
          challenge: dto.challenge,
          contribution: dto.contribution,
          outcome: dto.outcome,
          focus: dto.focus,
          features: dto.features,
          published: dto.published ?? true,
          featured: dto.featured ?? false,
          position: dto.position ?? 0,
        },
      });
      this.revalidate.trigger('projects');
      return toWire(row as unknown as Record<string, unknown>);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('A project with that slug already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.ensureExists(id);
    try {
      const data: Record<string, unknown> = {};
      if (dto.slug !== undefined) data.slug = dto.slug;
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.category !== undefined)
        data.category = toPrismaCategory(dto.category);
      if (dto.role !== undefined) data.role = dto.role;
      if (dto.context !== undefined) data.context = dto.context;
      if (dto.summary !== undefined) data.summary = dto.summary;
      if (dto.color !== undefined) data.color = dto.color;
      if (dto.ink !== undefined) data.ink = dto.ink;
      if (dto.symbol !== undefined) data.symbol = dto.symbol;
      if (dto.live !== undefined) data.live = dto.live;
      if (dto.image !== undefined) data.image = dto.image;
      if (dto.gallery !== undefined) data.gallery = dto.gallery;
      if (dto.overview !== undefined) data.overview = dto.overview;
      if (dto.challenge !== undefined) data.challenge = dto.challenge;
      if (dto.contribution !== undefined) data.contribution = dto.contribution;
      if (dto.outcome !== undefined) data.outcome = dto.outcome;
      if (dto.focus !== undefined) data.focus = dto.focus;
      if (dto.features !== undefined) data.features = dto.features;
      if (dto.published !== undefined) data.published = dto.published;
      if (dto.featured !== undefined) data.featured = dto.featured;
      if (dto.position !== undefined) data.position = dto.position;

      const row = await this.prisma.project.update({
        where: { id },
        data: data as never,
      });
      this.revalidate.trigger('projects');
      return toWire(row as unknown as Record<string, unknown>);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('A project with that slug already exists.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.project.delete({ where: { id } });
    this.revalidate.trigger('projects');
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Project not found.');
  }
}
