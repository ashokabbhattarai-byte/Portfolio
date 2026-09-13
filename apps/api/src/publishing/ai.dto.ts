import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BlogImageDto } from '../blogs/dto/create-blog.dto';

/* Deliberately narrower than the admin DTOs. `published`, `publishedAt`,
   `position`, `featured` and the LinkedIn fields are absent, so an agent
   cannot reach them at all — with forbidNonWhitelisted the request is
   rejected rather than silently stripped. */

class AiSeoFields {
  @IsOptional() @IsString() @MaxLength(200) seoTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(400) seoDescription?: string | null;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  canonicalUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(200) ogTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(400) ogDescription?: string | null;
  @IsOptional() @IsString() @MaxLength(200) twitterTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(400) twitterDescription?: string | null;
  @IsOptional() @IsBoolean() noIndex?: boolean;
  @IsOptional() @IsBoolean() noFollow?: boolean;
  @IsOptional() @IsString() @MaxLength(100) featuredImageId?: string | null;
  @IsOptional() @IsString() @MaxLength(100) ogImageId?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  inlineMediaIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BlogImageDto)
  images?: BlogImageDto[];
  @IsOptional() @IsString() @MaxLength(80) aiProvider?: string | null;
  @IsOptional() @IsString() @MaxLength(100) aiModel?: string | null;
}

export class AiCreateBlogDto extends AiSeoFields {
  @IsString() @MinLength(2) @MaxLength(200) title!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case letters, numbers and hyphens',
  })
  slug?: string;

  @IsString() @MaxLength(400) excerpt!: string;
  @IsString() @MaxLength(200000) content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(60, { each: true })
  tags?: string[];

  /** Retries carrying the same key return the original article instead of
   *  creating a second one. */
  @IsOptional() @IsString() @MaxLength(100) idempotencyKey?: string;
}

export class AiUpdateBlogDto extends AiSeoFields {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case letters, numbers and hyphens',
  })
  slug?: string;

  @IsOptional() @IsString() @MaxLength(400) excerpt?: string;
  @IsOptional() @IsString() @MaxLength(200000) content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(60, { each: true })
  tags?: string[];

  /** Accepted, but the guard's scope check is applied on top: a key without
   *  blog:publish is refused here exactly as it is on /publish. */
  @IsOptional()
  @IsIn([
    'DRAFT',
    'REVIEW',
    'PUBLISHED',
    'SCHEDULED',
    'UNPUBLISHED',
    'ARCHIVED',
  ])
  status?: string;

  @IsOptional() @IsDateString() scheduledAt?: string | null;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class AiScheduleDto {
  /** Must carry an explicit offset or Z. A bare local time is ambiguous and
   *  BlogsService rejects it with INVALID_SCHEDULE_TIME. */
  @IsDateString() scheduledAt!: string;

  @IsOptional() @IsString() @MaxLength(80) timezone?: string;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class AiAttachImageDto {
  @IsString() @MaxLength(100) mediaId!: string;

  @IsOptional()
  @IsIn(['FEATURED_IMAGE', 'OG_IMAGE'])
  slot?: 'FEATURED_IMAGE' | 'OG_IMAGE';

  @IsOptional() @IsString() @MaxLength(200) alt?: string;
}

export class AiPublishDto {
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}
