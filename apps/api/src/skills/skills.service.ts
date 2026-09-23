import { AdminPageQuery, pageOrder } from '../common/admin-page.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Skill } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

function toWire(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    name: row.name as string,
    items: row.items as string,
    position: row.position as number,
  };
}

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async search(q: AdminPageQuery) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { items: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        orderBy: pageOrder(q),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.skill.count({ where }),
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

  async list(): Promise<Skill[]> {
    const rows = await this.prisma.skill.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => toWire(r as unknown as Record<string, unknown>));
  }

  async get(id: string): Promise<Skill> {
    const row = await this.prisma.skill.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Skill not found.');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async create(dto: CreateSkillDto): Promise<Skill> {
    const row = await this.prisma.skill.create({
      data: { name: dto.name, items: dto.items, position: dto.position ?? 0 },
    });
    this.revalidate.trigger('skills');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateSkillDto): Promise<Skill> {
    await this.ensure(id);
    const row = await this.prisma.skill.update({
      where: { id },
      data: dto as never,
    });
    this.revalidate.trigger('skills');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    await this.ensure(id);
    await this.prisma.skill.delete({ where: { id } });
    this.revalidate.trigger('skills');
  }

  private async ensure(id: string): Promise<void> {
    const exists = await this.prisma.skill.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Skill not found.');
  }
}
