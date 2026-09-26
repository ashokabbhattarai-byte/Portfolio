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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { actorFrom, fail, type PublisherRequest } from '../publishing/common';
import { PageQuery } from '../publishing/query.dto';
import { MAX_IMAGE_BYTES } from './image-pipeline';
import { ImageGenerationService } from './image-generation.service';
import {
  GenerateImageDto,
  ImportImageDto,
  MediaMetadataDto,
} from './media.dto';
import { MediaService } from './media.service';

/** Admin-facing media library. The AI surface reaches the same MediaService
 *  through PublishingModule rather than calling these routes, so the two share
 *  validation and audit behaviour without sharing an auth model. */
@Controller('media')
@Roles('ADMIN', 'EDITOR')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly generation: ImageGenerationService,
  ) {}

  @Get()
  list(@Query() query: PageQuery) {
    return this.media.list(query);
  }

  /** Lets the admin UI hide or explain the generate action instead of
   *  offering a button that always fails. */
  @Get('capabilities')
  capabilities() {
    return { generation: this.generation.describe() };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.media.get(id);
  }

  /** Which articles reference an asset. Powers the library's "used in"
   *  display and names exactly what blocks a delete. */
  @Get(':id/usage')
  usage(@Param('id') id: string) {
    return this.media.usage(id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  upload(
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

  @Post('import')
  importUrl(@Body() dto: ImportImageDto, @Req() req: PublisherRequest) {
    return this.media.importFromUrl(dto, actorFrom(req));
  }

  @Post('generate')
  generate(@Body() dto: GenerateImageDto, @Req() req: PublisherRequest) {
    return this.media.generate(dto, actorFrom(req));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: MediaMetadataDto,
    @Req() req: PublisherRequest,
  ) {
    return this.media.update(id, dto, actorFrom(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: PublisherRequest) {
    return this.media.remove(id, actorFrom(req));
  }
}
