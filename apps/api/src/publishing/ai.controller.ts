import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../common/decorators/public.decorator';
import { BlogsService } from '../blogs/blogs.service';
import { MediaService } from '../media/media.service';
import { MAX_IMAGE_BYTES } from '../media/image-pipeline';
import {
  GenerateImageDto,
  ImportImageDto,
  MediaMetadataDto,
} from '../media/media.dto';
import { actorFrom, fail, type PublisherRequest } from './common';
import { PageQuery } from './query.dto';
import { PublisherGuard } from './publisher.guard';
import { RequireScope, STATUS_SCOPE, type Scope } from './scopes';
import {
  AiAttachImageDto,
  AiCreateBlogDto,
  AiPublishDto,
  AiScheduleDto,
  AiUpdateBlogDto,
} from './ai.dto';

/**
 * The API external agents talk to. Every route delegates to the same
 * BlogsService and MediaService the admin UI uses, so validation, auditing,
 * revisions and revalidation behave identically no matter who made the call.
 *
 * Authentication is by `pf_live_` key only; PublisherGuard resolves the key
 * and enforces the scope each route declares.
 */
@Public()
@UseGuards(PublisherGuard)
@Controller('v1/ai')
export class AiController {
  constructor(
    private readonly blogs: BlogsService,
    private readonly media: MediaService,
  ) {}

  /** A status in a request body is a privilege request, not a data field.
   *  Without this, `blog:update` alone would be enough to publish. */
  private assertStatusAllowed(req: PublisherRequest, status?: string): void {
    if (!status) return;
    const needed = STATUS_SCOPE[status];
    if (!needed) return;
    const held = (req.publisher?.scopes ?? []) as Scope[];
    if (!held.includes(needed)) {
      fail(
        'MISSING_SCOPE',
        `Setting status to ${status} requires the "${needed}" scope.`,
        403,
      );
    }
  }

  // ---------------------------------------------------------------- blogs

  @Get('blogs')
  @RequireScope('blog:read')
  list(@Query() query: PageQuery) {
    return this.blogs.search(query);
  }

  @Get('blogs/:id')
  @RequireScope('blog:read')
  get(@Param('id') id: string) {
    return this.blogs.getById(id, true);
  }

  /** Always lands as a draft regardless of what was sent: publishing is a
   *  separate, separately-scoped action. */
  @Post('blogs')
  @RequireScope('blog:create')
  create(@Body() dto: AiCreateBlogDto, @Req() req: PublisherRequest) {
    return this.blogs.create(
      { ...dto, status: 'DRAFT', published: false },
      actorFrom(req),
    );
  }

  @Patch('blogs/:id')
  @RequireScope('blog:update')
  update(
    @Param('id') id: string,
    @Body() dto: AiUpdateBlogDto,
    @Req() req: PublisherRequest,
  ) {
    this.assertStatusAllowed(req, dto.status);
    return this.blogs.update(
      id,
      dto as Parameters<BlogsService['update']>[1],
      actorFrom(req),
    );
  }

  @Post('blogs/:id/publish')
  @RequireScope('blog:publish')
  publish(
    @Param('id') id: string,
    @Body() dto: AiPublishDto,
    @Req() req: PublisherRequest,
  ) {
    return this.blogs.update(
      id,
      { status: 'PUBLISHED', expectedVersion: dto.expectedVersion },
      actorFrom(req),
    );
  }

  @Post('blogs/:id/schedule')
  @RequireScope('blog:schedule')
  schedule(
    @Param('id') id: string,
    @Body() dto: AiScheduleDto,
    @Req() req: PublisherRequest,
  ) {
    return this.blogs.update(
      id,
      {
        status: 'SCHEDULED',
        scheduledAt: dto.scheduledAt,
        timezone: dto.timezone,
        expectedVersion: dto.expectedVersion,
      },
      actorFrom(req),
    );
  }

  @Post('blogs/:id/unpublish')
  @RequireScope('blog:unpublish')
  unpublish(
    @Param('id') id: string,
    @Body() dto: AiPublishDto,
    @Req() req: PublisherRequest,
  ) {
    return this.blogs.update(
      id,
      { status: 'UNPUBLISHED', expectedVersion: dto.expectedVersion },
      actorFrom(req),
    );
  }

  /** Attaching an image is an edit of the article, so it needs blog:update
   *  rather than a media scope. */
  @Post('blogs/:id/images')
  @RequireScope('blog:update')
  async attachImage(
    @Param('id') id: string,
    @Body() dto: AiAttachImageDto,
    @Req() req: PublisherRequest,
  ) {
    const actor = actorFrom(req);
    if (dto.alt !== undefined) {
      await this.media.update(dto.mediaId, { alt: dto.alt }, actor);
    }
    const slot = dto.slot ?? 'FEATURED_IMAGE';
    return this.blogs.update(
      id,
      slot === 'OG_IMAGE'
        ? { ogImageId: dto.mediaId }
        : { featuredImageId: dto.mediaId },
      actor,
    );
  }

  // ---------------------------------------------------------------- media

  @Get('media')
  @RequireScope('media:read')
  listMedia(@Query() query: PageQuery) {
    return this.media.list(query);
  }

  @Get('media/:id')
  @RequireScope('media:read')
  getMedia(@Param('id') id: string) {
    return this.media.get(id);
  }

  @Post('media/upload')
  @RequireScope('media:upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  uploadMedia(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: MediaMetadataDto,
    @Req() req: PublisherRequest,
  ) {
    if (!file) fail('NO_FILE', 'Attach an image in the "file" field.', 400);
    return this.media.upload(
      file.buffer,
      file.originalname,
      actorFrom(req),
      meta,
    );
  }

  /** The practical path when the agent found an image elsewhere: we fetch it
   *  and store our own copy rather than depending on someone else's URL. */
  @Post('media/import')
  @RequireScope('media:upload')
  importMedia(@Body() dto: ImportImageDto, @Req() req: PublisherRequest) {
    return this.media.importFromUrl(dto, actorFrom(req));
  }

  @Post('media/generate')
  @RequireScope('media:generate')
  generateMedia(@Body() dto: GenerateImageDto, @Req() req: PublisherRequest) {
    return this.media.generate(dto, actorFrom(req));
  }

  @Delete('media/:id')
  @RequireScope('media:delete')
  deleteMedia(@Param('id') id: string, @Req() req: PublisherRequest) {
    return this.media.remove(id, actorFrom(req));
  }
}
