import { Module } from '@nestjs/common';
import { BlogsModule } from '../blogs/blogs.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [BlogsModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
