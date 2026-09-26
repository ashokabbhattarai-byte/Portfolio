import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/prisma-client';
import { ObjectStorageService } from './object-storage.service';
import { ImageImportService } from './image-import.service';
import {
  ImageGenerationService,
  type ImagePurpose,
} from './image-generation.service';
import { optimizeImage } from './image-pipeline';
import { type Actor, fail } from '../publishing/common';
import { auditData } from '../publishing/audit.service';
import { PageQuery } from '../publishing/query.dto';
import {
  GenerateImageDto,
  ImportImageDto,
  MediaMetadataDto,
} from './media.dto';

/** Provenance recorded alongside the asset when it did not come from a plain
 *  admin upload. Kept out of the caller's hands so `source` cannot be spoofed
 *  through a request body. */
interface Provenance {
  provider: string;
  model: string;
  prompt: string;
  purpose: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly importer: ImageImportService,
    private readonly generator: ImageGenerationService,
  ) {}

  /** The single entry point for bytes becoming a MediaAsset. Everything is
   *  re-encoded to WebP by `optimizeImage` first, which is also what strips
   *  EXIF and rejects polyglot files, so no caller can bypass validation. */
  async upload(
    bytes: Buffer,
    filename: string,
    actor: Actor,
    meta: MediaMetadataDto = {},
    generation?: Provenance,
    sourceUrl?: string,
  ) {
    const image = await optimizeImage(bytes);
    const key = `media/${randomUUID()}.webp`;
    let uploaded = false;
    try {
      const url = await this.storage.upload(key, image.bytes, image.mimeType);
      uploaded = true;
      return await this.prisma.$transaction(async (tx) => {
        const asset = await tx.mediaAsset.create({
          data: {
            filename: key.split('/')[1],
            originalFilename:
              filename.replace(/[^\p{L}\p{N}._ -]/gu, '-').slice(0, 200) ||
              'image',
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
            size: image.bytes.length,
            provider: this.storage.provider,
            objectKey: key,
            url,
            alt: meta.alt ?? '',
            caption: meta.caption ?? '',
            source: generation
              ? 'AI_GENERATED'
              : sourceUrl
                ? 'URL_IMPORT'
                : actor.type === 'AI_API_KEY'
                  ? 'AI_UPLOAD'
                  : 'ADMIN_UPLOAD',
            uploadedBy: actor.id,
            generatedByAI: Boolean(generation),
            aiProvider: generation?.provider,
            aiModel: generation?.model,
            prompt: generation?.prompt ?? sourceUrl,
            purpose: generation?.purpose,
          },
        });
        await tx.auditEvent.create({
          data: auditData(
            actor,
            generation
              ? 'MEDIA_GENERATED'
              : sourceUrl
                ? 'MEDIA_IMPORTED'
                : 'MEDIA_UPLOADED',
            'MEDIA',
            asset.id,
          ),
        });
        return asset;
      });
    } catch (error) {
      /* The object is already in the bucket but the row is not, so drop the
         object rather than leave bytes nothing can reference. */
      if (uploaded) {
        await this.storage
          .delete(key)
          .catch(() => this.logger.error('Orphaned media cleanup failed.'));
      }
      if (error && typeof error === 'object' && 'getStatus' in error)
        throw error;
      fail(
        'MEDIA_UPLOAD_FAILED',
        'The image could not be saved. Your article has not been changed.',
        503,
      );
    }
  }

  /** Pulls an image the agent found elsewhere into our own storage. Hotlinking
   *  the original would break the moment it moves or starts rate-limiting us. */
  async importFromUrl(dto: ImportImageDto, actor: Actor) {
    const fetched = await this.importer.fetchImage(dto.url);
    return this.upload(
      fetched.bytes,
      dto.filename ?? fetched.filename,
      actor,
      { alt: dto.alt, caption: dto.caption },
      undefined,
      fetched.sourceUrl,
    );
  }

  async generate(dto: GenerateImageDto, actor: Actor) {
    const image = await this.generator.generate({
      prompt: dto.prompt,
      purpose: dto.purpose as ImagePurpose,
      width: dto.width,
      height: dto.height,
    });
    return this.upload(
      image.bytes,
      `${dto.purpose.toLowerCase()}.webp`,
      actor,
      { alt: dto.alt, caption: dto.caption },
      {
        provider: image.provider,
        model: image.model,
        prompt: dto.prompt,
        purpose: dto.purpose,
      },
    );
  }

  async list(query: PageQuery) {
    const where: Prisma.MediaAssetWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              {
                originalFilename: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { alt: { contains: query.search, mode: 'insensitive' } },
              { caption: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    /* Promise.all rather than $transaction: BEGIN/COMMIT around a read-only
       list+count adds two round trips for consistency nobody observes here. */
    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: {
            select: { featuredBlogs: true, ogBlogs: true, inlineBlogs: true },
          },
        },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return {
      items: rows.map(({ _count, ...row }) => ({
        ...row,
        usageCount: _count.featuredBlogs + _count.ogBlogs + _count.inlineBlogs,
        used: Object.values(_count).some((n) => n > 0),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(id: string) {
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) fail('MEDIA_NOT_FOUND', 'Image not found.', 404);
    return row;
  }

  /** Every non-deleted article referencing the asset, so the library can show
   *  exactly what blocks a delete and link straight to it. Uses the same
   *  reference checks as remove() so the two can never disagree. */
  async usage(id: string) {
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id, deletedAt: null },
      select: { url: true },
    });
    if (!row) fail('MEDIA_NOT_FOUND', 'Image not found.', 404);
    const articles = await this.prisma.blog.findMany({
      where: {
        deletedAt: null,
        OR: [
          { featuredImageId: id },
          { ogImageId: id },
          { inlineMedia: { some: { id } } },
          { content: { contains: row.url } },
          { coverImage: row.url },
          { images: { some: { url: row.url } } },
        ],
      },
      select: { id: true, slug: true, title: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { articles };
  }

  async update(id: string, dto: MediaMetadataDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.mediaAsset.findFirst({
        where: { id, deletedAt: null },
      });
      if (!row) fail('MEDIA_NOT_FOUND', 'Image not found.', 404);
      const updated = await tx.mediaAsset.update({
        where: { id },
        data: { alt: dto.alt, caption: dto.caption },
      });
      await tx.auditEvent.create({
        data: auditData(actor, 'MEDIA_UPDATED', 'MEDIA', id),
      });
      return updated;
    });
  }

  /** Soft-deletes only after proving nothing references the asset, and rolls
   *  the row back if the object store refuses, so the library never lists an
   *  asset whose bytes are already gone. */
  async remove(id: string, actor: Actor) {
    const asset = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM media_assets WHERE id=${id} FOR UPDATE`;
      const row = await tx.mediaAsset.findFirst({
        where: { id, deletedAt: null },
      });
      if (!row) fail('MEDIA_NOT_FOUND', 'Image not found.', 404);
      const used = await tx.blog.count({
        where: {
          deletedAt: null,
          OR: [
            { featuredImageId: id },
            { ogImageId: id },
            { inlineMedia: { some: { id } } },
            { content: { contains: row.url } },
            { coverImage: row.url },
            { images: { some: { url: row.url } } },
          ],
        },
      });
      if (used) {
        fail(
          'MEDIA_IN_USE',
          'This image is used by an article. Remove its references before deleting it.',
          409,
        );
      }
      await tx.mediaAsset.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return row;
    });

    try {
      if (asset.provider !== this.storage.provider) {
        fail(
          'STORAGE_PROVIDER_MISMATCH',
          'Switch storage to the asset’s provider before deleting it.',
        );
      }
      await this.storage.delete(asset.objectKey);
    } catch (error) {
      await this.prisma.mediaAsset.update({
        where: { id },
        data: { deletedAt: null },
      });
      throw error;
    }
    await this.prisma.auditEvent.create({
      data: auditData(actor, 'MEDIA_DELETED', 'MEDIA', id),
    });
    return { deleted: true };
  }
}
