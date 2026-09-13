import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEducationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  school!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  award!: string;

  @IsString()
  @MaxLength(120)
  dates!: string;

  @IsArray()
  @IsString({ each: true })
  notes!: string[];

  @IsOptional()
  @IsInt()
  position?: number;
}
