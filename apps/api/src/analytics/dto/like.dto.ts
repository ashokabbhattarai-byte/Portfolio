import { IsBoolean, IsString, IsUUID, MaxLength } from 'class-validator';
export class LikeDto {
  @IsString() @MaxLength(500) path!: string;
  @IsUUID('4') visitorId!: string;
  @IsBoolean() liked!: boolean;
}
