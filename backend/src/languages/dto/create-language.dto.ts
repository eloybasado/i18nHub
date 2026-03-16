import { IsString, Length, MinLength } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @Length(2, 10)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}
