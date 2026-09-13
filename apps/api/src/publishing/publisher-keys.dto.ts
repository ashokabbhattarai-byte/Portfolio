import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SCOPES } from './scopes';

export class CreateKeyDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SCOPES.length)
  @IsIn(SCOPES, { each: true })
  scopes!: string[];

  /** Absent means the key does not expire. Validated as a future instant by
   *  the service rather than here, so the error carries a usable code. */
  @IsOptional() @IsDateString() expiresAt?: string | null;
}

export class RotateKeyDto {
  @IsOptional() @IsDateString() expiresAt?: string | null;
}
