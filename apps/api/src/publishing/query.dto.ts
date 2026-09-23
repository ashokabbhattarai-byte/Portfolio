import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
export class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @IsString() @MaxLength(100) tag?: string;
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
  @IsOptional() @IsIn(['newest', 'oldest', 'updated', 'title']) sort?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsIn(['ADMIN', 'AI_API_KEY', 'SYSTEM']) actorType?: string;
  @IsOptional() @IsIn(['true', 'false']) success?: string;
}
