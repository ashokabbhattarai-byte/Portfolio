import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IMAGE_PURPOSES } from './image-generation.service';

export class MediaMetadataDto {
  @IsOptional() @IsString() @MaxLength(200) alt?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
}

export class GenerateImageDto extends MediaMetadataDto {
  @IsString() @MaxLength(4000) prompt!: string;
  @IsIn(IMAGE_PURPOSES) purpose!: string;
  @IsOptional() @IsInt() @IsIn([1024, 1536]) width?: number;
  @IsOptional() @IsInt() @IsIn([1024, 1536]) height?: number;
}

/** Pulls a third-party image into the media library. The URL is treated as
 *  hostile input by ImageImportService — this only checks it is well-formed. */
export class ImportImageDto extends MediaMetadataDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  url!: string;

  @IsOptional() @IsString() @MaxLength(200) filename?: string;
}

export class GenerateArticleDto {
  @IsString() @MaxLength(12000) prompt!: string;
  @IsOptional() @IsString() @MaxLength(100) idempotencyKey?: string;
}
