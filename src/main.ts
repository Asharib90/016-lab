import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from './config/config.service';
import { AppModule } from './app.module';

import { HttpExceptionFilter } from './app/common/filter/exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as csurf from 'csurf';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

dotenv.config();
import 'reflect-metadata';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from './app/common/interceptors';
import { createDocument } from './swagger/swagger';

const logger = new Logger('main');
(async () => {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: true,
  });

  //set csurf to protect from csrf attacks
  // app.use(csurf());

  // app.enableCors({
  //   allowedHeaders:
  //     'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe',
  //   origin: true,
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  // });

  // set helmet to protect from well-known web vulnerabilities by setting HTTP headers appropriately.
  app.use(helmet());

  // set validation pipe to validate request body
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  // set exception filter to handle all exceptions
  app.useGlobalFilters(new HttpExceptionFilter());

  // set versioning to all routes
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // set logging interceptor to log all requests
  app.useGlobalInterceptors(new LoggingInterceptor());

  // set response transform interceptor to log all requests
  app.useGlobalInterceptors(new TransformInterceptor());

  const configService = app.get(ConfigService);

  SwaggerModule.setup('/v1/swagger', app, createDocument(app));

  app.use(cookieParser(configService.get().cookieSecret));
  await app.listen(process.env.PORT || configService.get().port);
  logger.log(`SERVER IS RUNNING ON PORT ${configService.get().port}`);
})();
