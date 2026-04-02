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

export class SuggestTranslationsDto {
  @IsString()
  targetLanguageCode!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SuggestionInputItemDto)
  items!: SuggestionInputItemDto[];
}
