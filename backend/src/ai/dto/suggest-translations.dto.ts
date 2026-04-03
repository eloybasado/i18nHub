import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SuggestionInputItemDto {
  @IsString()
  key!: string;

  @IsString()
  referenceText!: string;

  @IsOptional()
  @IsString()
  currentText?: string;
}

class GlossaryEntryDto {
  @IsString()
  sourceTerm!: string;

  @IsString()
  targetTerm!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languageCodes?: string[];
}

export class SuggestTranslationsDto {
  @IsString()
  targetLanguageCode!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GlossaryEntryDto)
  glossary?: GlossaryEntryDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SuggestionInputItemDto)
  items!: SuggestionInputItemDto[];
}
