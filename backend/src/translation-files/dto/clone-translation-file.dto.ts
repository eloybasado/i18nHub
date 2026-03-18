import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CloneTranslationFileDto {
  @IsUUID()
  sourceTranslationFileId!: string;

  @IsUUID()
  targetLanguageId!: string;

  @IsOptional()
  @IsBoolean()
  clearValues?: boolean;
}
