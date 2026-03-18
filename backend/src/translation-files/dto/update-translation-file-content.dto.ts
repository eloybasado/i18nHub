import { IsObject } from 'class-validator';

export class UpdateTranslationFileContentDto {
  @IsObject()
  content!: Record<string, unknown>;
}
