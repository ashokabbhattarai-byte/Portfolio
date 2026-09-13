import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export const BUCKET = 'portfolio-storage';

/** Folder map – keeps the bucket tidy and enables fast prefix listing. */
export const FOLDERS = {
  projects: 'projects',
  blogs: 'blogs',
  profile: 'profile',
  certifications: 'certifications',
  education: 'education',
  experience: 'experience',
  skills: 'skills',
  misc: 'misc',
} as const;

export type Folder = keyof typeof FOLDERS;

const ALLOWED_MIME = new Set([
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8 MiB for portfolio imagery
const EXT_BY_MIME: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient | null;
  private readonly bucket: string;
  private readonly publicBase: string | null;
  private readonly enabled: boolean;

  async onModuleInit(): Promise<void> {
    if (this.enabled) await this.ensureBucket();
  }

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.config.get<string>('SUPABASE_BUCKET') ?? BUCKET;

    if (!url || !key) {
      this.client = null;
      this.publicBase = null;
      this.enabled = false;
      this.logger.warn(
        'Supabase storage disabled: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unset. Uploads will be rejected until configured.',
      );
      return;
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Public URL base for fast edge delivery: https://{ref}.supabase.co/storage/v1/object/public/<bucket>/
    this.publicBase = `${url.replace(/\/+$/, '')}/storage/v1/object/public/${this.bucket}`;
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Build a deterministic, slug-scoped object key. */
  buildPath(folder: Folder, filename: string, slug?: string): string {
    const safeFolder = FOLDERS[folder] ?? FOLDERS.misc;
    const base = slug
      ? `${safeFolder}/${slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`
      : safeFolder;

    const ext = filename.includes('.')
      ? filename
          .split('.')
          .pop()!
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      : '';
    const name =
      filename
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9-_]/gi, '-')
        .toLowerCase() || 'file';
    const id = randomUUID().slice(0, 8);
    const finalExt = ext || 'bin';
    return `${base}/${name}-${id}.${finalExt}`;
  }

  /** Validate mime + size before touching the network. */
  assertValid(file: { mimetype: string; size: number }): void {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type ${file.mimetype}. Allowed: ${[...ALLOWED_MIME].join(', ')}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `File too large. Max ${MAX_BYTES / 1024 / 1024} MiB.`,
      );
    }
  }

  /** Extension fallback from mime, for presign where only contentType is known. */
  extForMime(mime: string): string {
    return EXT_BY_MIME[mime] ?? 'bin';
  }

  getPublicUrl(path: string): string {
    if (!this.enabled || !this.publicBase)
      throw new BadRequestException('Storage not configured.');
    // Supabase public URLs are edge-cached; the path is the cache key.
    return `${this.publicBase}/${path.replace(/^\/+/, '')}`;
  }

  /** Ensure the bucket exists (idempotent). Best effort, logs warning if lacking permission. */
  async ensureBucket(): Promise<void> {
    if (!this.client) return;
    const { data, error } = await this.client.storage.listBuckets();
    if (error) {
      this.logger.warn(`Could not list buckets: ${error.message}`);
      return;
    }
    if (data?.some((b) => b.name === this.bucket)) return;
    const { error: createError } = await this.client.storage.createBucket(
      this.bucket,
      {
        public: true,
        fileSizeLimit: `${MAX_BYTES}`,
        allowedMimeTypes: [...ALLOWED_MIME],
      },
    );
    if (createError)
      this.logger.warn(
        `Could not create bucket ${this.bucket}: ${createError.message}`,
      );
    else this.logger.log(`Created bucket ${this.bucket}`);
  }

  /** Direct upload via service client (backend proxy). Fast for <8 MiB, one hop. */
  async upload(
    path: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<{ path: string; publicUrl: string }> {
    if (!this.client)
      throw new BadRequestException(
        'Storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, bytes, { contentType, upsert: true, cacheControl: '3600' });
    if (error) throw new BadRequestException(`Upload failed: ${error.message}`);
    return { path, publicUrl: this.getPublicUrl(path) };
  }

  /** Presigned upload URL – frontend PUTs directly to Supabase, zero backend bandwidth. */
  async createPresignedUploadUrl(
    path: string,
  ): Promise<{ path: string; signedUrl: string; token: string }> {
    if (!this.client) throw new BadRequestException('Storage not configured.');
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(path);
    if (error || !data)
      throw new BadRequestException(
        `Could not create signed URL: ${error?.message ?? 'unknown'}`,
      );
    return { path, signedUrl: data.signedUrl, token: data.token };
  }

  /** Upload to a presigned token (server-side confirm, rarely needed – most uploads are direct). */
  async uploadToSignedUrl(
    path: string,
    token: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<{ path: string; publicUrl: string }> {
    if (!this.client) throw new BadRequestException('Storage not configured.');
    const { error } = await this.client.storage
      .from(this.bucket)
      .uploadToSignedUrl(path, token, bytes, {
        contentType,
      } as never);
    if (error)
      throw new BadRequestException(`Signed upload failed: ${error.message}`);
    return { path, publicUrl: this.getPublicUrl(path) };
  }

  async remove(paths: string[]): Promise<void> {
    if (!this.client) throw new BadRequestException('Storage not configured.');
    if (paths.length === 0) return;
    const { error } = await this.client.storage.from(this.bucket).remove(paths);
    if (error) throw new BadRequestException(`Delete failed: ${error.message}`);
  }

  async list(prefix: string): Promise<
    {
      name: string;
      id: string | null;
      updated_at: string | null;
      metadata: Record<string, unknown> | null;
    }[]
  > {
    if (!this.client) throw new BadRequestException('Storage not configured.');
    const clean = prefix.replace(/^\/+|\/+$/g, '');
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(clean || undefined, {
        limit: 100,
        sortBy: { column: 'updated_at', order: 'desc' },
      });
    if (error) throw new BadRequestException(`List failed: ${error.message}`);
    return (data ?? []) as never;
  }

  /** Try to extract a storage path from a public URL for deletion on replace. */
  pathFromPublicUrl(url: string): string | null {
    if (!this.publicBase) return null;
    if (!url.startsWith(this.publicBase)) return null;
    return url.slice(this.publicBase.length + 1);
  }
}
