import { IsUUID } from 'class-validator';

export class SetReferenceLanguageDto {
  @IsUUID()
  languageId!: string;
}
