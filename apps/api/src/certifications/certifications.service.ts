import { AdminPageQuery, pageOrder } from '../common/admin-page.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Certification } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';

function toWire(row: Record<string, unknown>): Certification {
  return {
    id: row.id as string,
    title: row.title as string,
    issuer: row.issuer as string,
    date: row.date as string,
    url: (row.url as string | null) ?? null,
    position: row.position as number,
  };
}

@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async search(q: AdminPageQuery) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { issuer: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.certification.findMany({
        where,
        orderBy: pageOrder(q),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.certification.count({ where }),
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

  async list(): Promise<Certification[]> {
    const rows = await this.prisma.certification.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => toWire(r as unknown as Record<string, unknown>));
  }

  async get(id: string): Promise<Certification> {
    const row = await this.prisma.certification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Certification not found.');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async create(dto: CreateCertificationDto): Promise<Certification> {
    const row = await this.prisma.certification.create({
      data: {
        title: dto.title,
        issuer: dto.issuer,
        date: dto.date,
        url: dto.url ?? null,
        position: dto.position ?? 0,
      },
    });
    this.revalidate.trigger('certifications');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async update(
    id: string,
    dto: UpdateCertificationDto,
  ): Promise<Certification> {
    await this.ensure(id);
    const row = await this.prisma.certification.update({
      where: { id },
      data: dto as never,
    });
    this.revalidate.trigger('certifications');
    return toWire(row as unknown as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    await this.ensure(id);
    await this.prisma.certification.delete({ where: { id } });
    this.revalidate.trigger('certifications');
  }

  private async ensure(id: string): Promise<void> {
    const exists = await this.prisma.certification.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Certification not found.');
  }
}
