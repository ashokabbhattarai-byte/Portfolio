import { Module } from '@nestjs/common';
import { BlogsModule } from '../blogs/blogs.module';
import { MediaModule } from '../media/media.module';
import { AiController } from './ai.controller';
import { AuditController } from './audit.controller';
import { PublisherGuard } from './publisher.guard';
import { PublisherKeysController } from './publisher-keys.controller';
import { PublisherKeysService } from './publisher-keys.service';
import { PublisherRateService } from './publisher-rate.service';

/* Binds the AI surface to the existing Blog and Media services rather than
   re-implementing either. PublisherGuard is provided (not APP_GUARD) so it
   applies only to the AI controller. */
@Module({
  imports: [BlogsModule, MediaModule],
  controllers: [AiController, PublisherKeysController, AuditController],
  providers: [PublisherKeysService, PublisherRateService, PublisherGuard],
  exports: [PublisherKeysService],
})
export class PublishingModule {}
