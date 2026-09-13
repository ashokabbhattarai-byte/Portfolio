import { IsArray, IsString } from 'class-validator';

export class DeleteDto {
  @IsArray()
  @IsString({ each: true })
  paths!: string[];
}
