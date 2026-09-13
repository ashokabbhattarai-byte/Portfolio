import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { DeleteDto } from './dto/delete.dto';
import { PresignDto } from './dto/presign.dto';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Fast path: presign for direct browser → Supabase PUT (zero backend egress). */
  @Post('presign')
  @Roles('ADMIN', 'EDITOR')
  async presign(@Body() dto: PresignDto) {
    if (!this.storage.isEnabled())
      throw new BadRequestException(
        'Storage not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    const mime = dto.contentType.toLowerCase();
    // Validate mime early so the signed URL isn't wasted
    this.storage.assertValid({ mimetype: mime, size: 0 } as never);
    const path = this.storage.buildPath(dto.folder, dto.filename, dto.slug);
    const { signedUrl, token } =
      await this.storage.createPresignedUploadUrl(path);
    return {
      path,
      signedUrl,
      token,
      publicUrl: this.storage.getPublicUrl(path),
      bucket: 'portfolio-storage',
    };
  }

  /** Proxy upload – convenient for admin forms, <8 MiB. */
  @Post('upload')
  @Roles('ADMIN', 'EDITOR')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('slug') slug?: string,
  ) {
    if (!file)
      throw new BadRequestException(
        'No file uploaded. Field name must be "file".',
      );
    this.storage.assertValid(file);
    const f = (folder as never) ?? 'misc';
    const path = this.storage.buildPath(f as never, file.originalname, slug);
    const result = await this.storage.upload(path, file.buffer, file.mimetype);
    return result;
  }

  /** After a presigned PUT, optionally confirm and get the canonical public URL. */
  @Post('confirm')
  @Roles('ADMIN', 'EDITOR')
  async confirm(@Body('path') path: string) {
    if (!path) throw new BadRequestException('path is required');
    return { path, publicUrl: this.storage.getPublicUrl(path) };
  }

  @Delete('object')
  @Roles('ADMIN', 'EDITOR')
  async remove(@Body() dto: DeleteDto) {
    await this.storage.remove(dto.paths);
    return { removed: dto.paths };
  }

  @Get('list')
  @Roles('ADMIN', 'EDITOR')
  async list(@Query('prefix') prefix?: string) {
    const data = await this.storage.list(prefix ?? '');
    return data;
  }

  @Get('public-url')
  @Roles('ADMIN', 'EDITOR')
  getPublicUrl(@Query('path') path: string) {
    if (!path) throw new BadRequestException('path is required');
    return { path, publicUrl: this.storage.getPublicUrl(path) };
  }
}
