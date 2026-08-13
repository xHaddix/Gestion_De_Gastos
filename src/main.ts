import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Response } from 'express';
import yaml from 'js-yaml';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', false);
  const swaggerPath = configService.get<string>('SWAGGER_PATH', 'docs');

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(
        configService.get<string>('SWAGGER_TITLE', 'API de Prueba Técnica'),
      )
      .setDescription(
        configService.get<string>(
          'SWAGGER_DESCRIPTION',
          'Documentación de la API en español',
        ),
      )
      .setVersion(configService.get<string>('SWAGGER_VERSION', '1.0.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    app.getHttpAdapter().get(`/${swaggerPath}-yaml`, (_req, res: Response) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(yaml.dump(document));
    });
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API disponible en http://localhost:${port}/${apiPrefix}`);
  if (swaggerEnabled) {
    logger.log(
      `Documentación Swagger en http://localhost:${port}/${swaggerPath}`,
    );
    logger.log(
      `Spec OpenAPI JSON en http://localhost:${port}/${swaggerPath}-json`,
    );
    logger.log(
      `Spec OpenAPI YAML en http://localhost:${port}/${swaggerPath}-yaml`,
    );
  }
}
void bootstrap();
