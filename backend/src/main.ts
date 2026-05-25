import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  console.log('CORS_ORIGIN raw:', JSON.stringify(process.env.CORS_ORIGIN));
  console.log('corsOrigins parsed:', corsOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      console.log('Request origin:', JSON.stringify(origin));
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin} not in ${corsOrigins}`));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
