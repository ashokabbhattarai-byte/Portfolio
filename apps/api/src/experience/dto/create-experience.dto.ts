import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateExperienceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  role!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  company!: string;

  @IsString()
  @MaxLength(120)
  dates!: string;

  @IsString()
  detail!: string;

  @IsOptional()
  @IsInt()
  position?: number;
}
