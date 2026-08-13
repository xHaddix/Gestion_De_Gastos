import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { AppModule } from '../src/app.module';

async function generate() {
  const logger = new Logger('SwaggerGenerator');
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api'));

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
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const outputPath = resolve(process.cwd(), 'openapi.yaml');

  writeFileSync(outputPath, yaml.dump(document), 'utf8');
  logger.log(`Spec OpenAPI generado en ${outputPath}`);

  await app.close();
}

void generate();
