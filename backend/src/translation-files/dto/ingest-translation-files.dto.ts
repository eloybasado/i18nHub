import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsString,
  ValidateNested,
} from 'class-validator';

class IngestFileItemDto {
  @IsString()
  path!: string;

  @IsDefined()
  content!: unknown;
}

export class IngestTranslationFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngestFileItemDto)
  files!: IngestFileItemDto[];
}
