import { AdminPageQuery, pageOrder } from '../common/admin-page.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Experience } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

function toWire(row: Record<string, unknown>): Experience {
  return {
    id: row.id as string,
    role: row.role as string,
    company: row.company as string,
    dates: row.dates as string,
    detail: row.detail as string,
    position: row.position as number,
  };
}

@Injectable()
export class ExperienceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async search(q: AdminPageQuery) {
    const where = q.search
      ? {
          OR: [
            { role: { contains: q.search, mode: 'insensitive' as const } },
            { company: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
        orderBy: pageOrder(q),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.experience.count({ where }),
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

  async list(): Promise<Experience[]> {
    const rows = await this.prisma.experience.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => toWire(r as unknown as Record<string, unknown>));
  }

  async get(id: string): Promise<Experience> {
    const row = await this.prisma.experience.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Experience not found.');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async create(dto: CreateExperienceDto): Promise<Experience> {
    const row = await this.prisma.experience.create({
      data: {
        role: dto.role,
        company: dto.company,
        dates: dto.dates,
        detail: dto.detail,
        position: dto.position ?? 0,
      },
    });
    this.revalidate.trigger('experience');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateExperienceDto): Promise<Experience> {
    await this.ensure(id);
    const row = await this.prisma.experience.update({
      where: { id },
      data: dto as never,
    });
    this.revalidate.trigger('experience');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    await this.ensure(id);
    await this.prisma.experience.delete({ where: { id } });
    this.revalidate.trigger('experience');
  }

  private async ensure(id: string): Promise<void> {
    const row = await this.prisma.experience.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Experience not found.');
  }
}
