import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BlogImageDto {
  @IsString()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string | null;

  @IsOptional()
  @IsIn(['COVER', 'HERO', 'INLINE', 'GALLERY', 'THUMBNAIL'])
  placement?: 'COVER' | 'HERO' | 'INLINE' | 'GALLERY' | 'THUMBNAIL';

  @IsOptional()
  position?: number;
}

export class CreateBlogDto {
  /* Optional so an agent can send a title alone; BlogsService.create derives
     the slug from the title when this is absent. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case letters, numbers and hyphens',
  })
  slug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(400)
  excerpt!: string;

  @IsString()
  @MaxLength(200000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  gallery?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(60, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  position?: number;

  @IsOptional()
  @IsIn([
    'DRAFT',
    'REVIEW',
    'PUBLISHED',
    'SCHEDULED',
    'UNPUBLISHED',
    'ARCHIVED',
  ])
  status?:
    'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'SCHEDULED' | 'UNPUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'linkedinUrl must be a URL' })
  linkedinUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedinPostId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  linkedinStatus?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogImageDto)
  images?: BlogImageDto[];

  @IsOptional() @IsString() @MaxLength(100) featuredImageId?: string | null;
  @IsOptional() @IsString() @MaxLength(100) ogImageId?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  inlineMediaIds?: string[];
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
  @IsOptional() @IsString() @MaxLength(80) aiProvider?: string | null;
  @IsOptional() @IsString() @MaxLength(100) aiModel?: string | null;
  @IsOptional() @IsString() @MaxLength(80) timezone?: string;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
  @IsOptional() @IsString() @MaxLength(100) idempotencyKey?: string;
}
