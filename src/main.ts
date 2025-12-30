import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Configure CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Configure helmet
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  const config = new DocumentBuilder()
    .setTitle('Eequ Recruit API')
    .setDescription('API documentation for the Eequ Recruit application')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}/api`);
}

bootstrap();
