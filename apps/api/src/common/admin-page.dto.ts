import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class AdminPageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @IsIn(['position', 'newest', 'oldest']) sort:
    'position' | 'newest' | 'oldest' = 'position';
}
export function pageOrder(q: AdminPageQuery) {
  return q.sort === 'position'
    ? [{ position: 'asc' as const }, { id: 'asc' as const }]
    : [
        {
          createdAt: q.sort === 'oldest' ? ('asc' as const) : ('desc' as const),
        },
        { id: 'asc' as const },
      ];
}
