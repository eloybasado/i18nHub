import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { LanguagesModule } from './languages/languages.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { TranslationFilesModule } from './translation-files/translation-files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    LanguagesModule,
    TranslationFilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
