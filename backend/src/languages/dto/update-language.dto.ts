import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @Length(2, 10)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
