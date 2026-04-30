import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ReviewTranslationQualityDto {
  @IsUUID()
  @IsNotEmpty()
  translationFileId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  targetLanguageCodes: string[];
}
