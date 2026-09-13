import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ImageGenerationService } from './image-generation.service';
import { ImageImportService } from './image-import.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ObjectStorageService } from './object-storage.service';

/* ObjectStorageService still delegates to the legacy StorageService when the
   provider is Supabase, which is why StorageModule is imported rather than
   duplicated here. */
@Module({
  imports: [StorageModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    ObjectStorageService,
    ImageImportService,
    ImageGenerationService,
  ],
  exports: [MediaService, ObjectStorageService, ImageGenerationService],
})
export class MediaModule {}
