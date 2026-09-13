import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;

  /* No complexity rules on the way in: this only has to match what is already
     stored, and a strict rule here would leak the policy. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
