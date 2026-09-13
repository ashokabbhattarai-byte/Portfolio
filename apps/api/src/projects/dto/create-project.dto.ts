import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const HEX = /^#[0-9a-fA-F]{6}$/;

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lower-case letters, numbers and hyphens',
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsIn(['AI', 'Full stack', 'Blockchain'])
  category!: 'AI' | 'Full stack' | 'Blockchain';

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  role!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  context!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(400)
  summary!: string;

  @IsString()
  @Matches(HEX, { message: 'color must be a hex like #f4f3ee' })
  color!: string;

  @IsString()
  @Matches(HEX, { message: 'ink must be a hex like #111111' })
  ink!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  symbol!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  live?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  gallery?: string | null;

  @IsString()
  @MinLength(4)
  overview!: string;

  @IsString()
  @MinLength(4)
  challenge!: string;

  @IsString()
  @MinLength(4)
  contribution!: string;

  @IsString()
  @MinLength(4)
  outcome!: string;

  @IsArray()
  @IsString({ each: true })
  focus!: string[];

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  position?: number;
}
