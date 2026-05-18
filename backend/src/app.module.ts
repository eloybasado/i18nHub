import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { DeliveryModule } from './delivery/delivery.module';
import { AnalysisModule } from './analysis/analysis.module';
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
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    PrismaModule,
    AdminModule,
    DeliveryModule,
    AuthModule,
    AiModule,
    AnalysisModule,
    ProjectsModule,
    LanguagesModule,
    TranslationFilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
