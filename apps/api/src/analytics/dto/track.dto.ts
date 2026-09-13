import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
export class TrackDto {
  @IsString() @MaxLength(500) path!: string;
  @IsUUID() eventId!: string;
  @IsOptional() @IsUUID() visitorId?: string;
  // Retained for old clients; associations are always resolved from the public URL.
  @IsOptional() @IsString() @MaxLength(100) blogId?: string | null;
  @IsOptional() @IsString() @MaxLength(100) projectId?: string | null;
  @IsOptional() @IsString() @MaxLength(500) referer?: string | null;
}
