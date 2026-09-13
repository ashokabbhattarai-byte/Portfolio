import { Injectable } from '@nestjs/common';
import type { Profile } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

function toWire(row: Record<string, unknown>): Profile {
  return {
    name: row.name as string,
    role: row.role as string,
    location: row.location as string,
    email: row.email as string,
    github: row.github as string,
    linkedin: (row.linkedin as string | null) ?? null,
    resume: row.resume as string,
    description: row.description as string,
    languages: row.languages as string,
  };
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  async get(): Promise<Profile> {
    const row = await this.prisma.profile.findUnique({
      where: { id: 'profile' },
    });
    if (!row) {
      // No row yet — return something to keep public site rendering; will be created on first patch
      throw new Error('Profile not seeded. Run db:seed.');
    }
    return toWire(row as unknown as Record<string, unknown>);
  }

  async update(dto: UpdateProfileDto): Promise<Profile> {
    const row = await this.prisma.profile.upsert({
      where: { id: 'profile' },
      update: {
        name: dto.name,
        role: dto.role,
        location: dto.location,
        email: dto.email,
        github: dto.github,
        linkedin: dto.linkedin ?? null,
        resume: dto.resume,
        description: dto.description,
        languages: dto.languages,
      },
      create: {
        id: 'profile',
        name: dto.name,
        role: dto.role,
        location: dto.location,
        email: dto.email,
        github: dto.github,
        linkedin: dto.linkedin ?? null,
        resume: dto.resume,
        description: dto.description,
        languages: dto.languages,
      },
    });
    this.revalidate.trigger('profile');
    return toWire(row as unknown as Record<string, unknown>);
  }
}
