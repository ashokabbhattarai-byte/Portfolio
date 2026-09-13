import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PresignDto {
  @IsIn([
    'projects',
    'blogs',
    'profile',
    'certifications',
    'education',
    'experience',
    'skills',
    'misc',
  ])
  folder!:
    | 'projects'
    | 'blogs'
    | 'profile'
    | 'certifications'
    | 'education'
    | 'experience'
    | 'skills'
    | 'misc';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  filename!: string;

  @IsString()
  @MaxLength(120)
  contentType!: string;
}
