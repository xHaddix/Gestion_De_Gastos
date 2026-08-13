import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TransformInterceptor } from './../src/common/interceptor/transform.interceptor';

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new TransformInterceptor(moduleFixture.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api').expect(200);

    const body = res.body as Envelope<string>;
    expect(body.success).toBe(true);
    expect(body.data).toBe('¡Bienvenido a la API de Prueba Técnica!');
  });

  it('/api/documents (GET) devuelve una lista envuelta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/documents')
      .expect(200);

    const body = res.body as Envelope<unknown[]>;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
