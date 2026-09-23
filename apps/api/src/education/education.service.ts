import { AdminPageQuery, pageOrder } from '../common/admin-page.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Education } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

function toWire(row: Record<string, unknown>): Education {
  return {
    id: row.id as string,
    school: row.school as string,
    award: row.award as string,
    dates: row.dates as string,
    notes: (row.notes as string[]) ?? [],
    position: row.position as number,
  };
}

@Injectable()
export class EducationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async search(q: AdminPageQuery) {
    const where = q.search
      ? {
          OR: [
            { school: { contains: q.search, mode: 'insensitive' as const } },
            { degree: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.education.findMany({
        where,
        orderBy: pageOrder(q),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.education.count({ where }),
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

  async list(): Promise<Education[]> {
    const rows = await this.prisma.education.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => toWire(r as unknown as Record<string, unknown>));
  }

  async get(id: string): Promise<Education> {
    const row = await this.prisma.education.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Education not found.');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async create(dto: CreateEducationDto): Promise<Education> {
    const row = await this.prisma.education.create({
      data: {
        school: dto.school,
        award: dto.award,
        dates: dto.dates,
        notes: dto.notes,
        position: dto.position ?? 0,
      },
    });
    this.revalidate.trigger('education');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateEducationDto): Promise<Education> {
    await this.ensure(id);
    const row = await this.prisma.education.update({
      where: { id },
      data: dto as never,
    });
    this.revalidate.trigger('education');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    await this.ensure(id);
    await this.prisma.education.delete({ where: { id } });
    this.revalidate.trigger('education');
  }

  private async ensure(id: string): Promise<void> {
    const exists = await this.prisma.education.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Education not found.');
  }
}
