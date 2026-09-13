import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  role!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  location!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsUrl({}, { message: 'github must be a URL' })
  github!: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'linkedin must be a URL' })
  linkedin?: string | null;

  @IsString()
  @MaxLength(500)
  resume!: string;

  @IsString()
  @MinLength(4)
  description!: string;

  @IsString()
  languages!: string;
}
