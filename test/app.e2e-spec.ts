import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface AuthResponse {
  accessToken: string;
  user: { id: number; email: string; name: string | null };
}

interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  password?: string;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;

  const email = `user-${Date.now()}@example.com`;
  const password = 'Password123!';

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
    await app.init();

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    authToken = (login.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('¡Bienvenido a la API de Prueba Técnica!');
  });

  describe('auth', () => {
    it('returns the user without password on register', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `other-${Date.now()}@example.com`, password })
        .expect(201);

      const body = res.body as UserResponse;
      expect(body.email).toBeDefined();
      expect(body.password).toBeUndefined();
    });

    it('rejects a duplicated email (409)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password })
        .expect(409);
    });

    it('rejects login with a wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword123!' })
        .expect(401);
    });

    it('returns the profile with a valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = res.body as UserResponse;
      expect(body.email).toBe(email);
      expect(body.password).toBeUndefined();
    });

    it('rejects the profile without a token (401)', async () => {
      await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('rejects an invalid token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);
    });
  });
});
