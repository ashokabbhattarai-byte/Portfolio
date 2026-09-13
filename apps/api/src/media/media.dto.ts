import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class MediaMetadataDto {
  @IsOptional() @IsString() @MaxLength(200) alt?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
}
export class GenerateImageDto extends MediaMetadataDto {
  @IsString() @MaxLength(4000) prompt!:string;
  @IsIn(['FEATURED_IMAGE','INLINE_IMAGE','OG_IMAGE','DIAGRAM','SOCIAL_CARD']) purpose!:string;
  @IsOptional() @IsIn([1024,1536]) width?:number;
  @IsOptional() @IsIn([1024,1536]) height?:number;
}
export class GenerateArticleDto {
  @IsString() @MaxLength(12000) prompt!:string;
  @IsOptional() @IsString() @MaxLength(100) idempotencyKey?:string;
}
