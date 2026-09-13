import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  issuer!: string;

  @IsString()
  @MaxLength(60)
  date!: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'url must be a URL' })
  url?: string | null;

  @IsOptional()
  @IsInt()
  position?: number;
}
