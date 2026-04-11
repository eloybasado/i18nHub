import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class AiContextGlossaryEntryDto {
  @IsString()
  sourceTerm!: string;

  @IsString()
  targetTerm!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languageCodes?: string[];
}

export class UpdateAiContextDto {
  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiContextGlossaryEntryDto)
  glossary?: AiContextGlossaryEntryDto[];
}
