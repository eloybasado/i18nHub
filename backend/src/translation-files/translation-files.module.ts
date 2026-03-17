import { Module } from '@nestjs/common';
import { TranslationFilesController } from './translation-files.controller';
import { TranslationFilesService } from './translation-files.service';

@Module({
  controllers: [TranslationFilesController],
  providers: [TranslationFilesService],
})
export class TranslationFilesModule {}
