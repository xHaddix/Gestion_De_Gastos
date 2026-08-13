# Prueba Técnica — Backend NestJS

Backend moderno construido con [NestJS](https://nestjs.com/) y **PostgreSQL** que sirve como plantilla de referencia. Incluye autenticación con JWT, documentación de la API en **Swagger (en español)** y despliegue con **Docker Compose**.

## Características

- Autenticación con **JWT** (`register`, `login`, `profile`) y contraseñas cifradas con `bcryptjs`
- Base de datos **PostgreSQL** con **TypeORM** (entidad `users`)
- Configuración por variables de entorno (`.env`) con validación automática (`class-validator`)
- Documentación de la API con **Swagger totalmente en español**, incluyendo la especificación **OpenAPI en YAML** (archivo `openapi.yaml` en la raíz)
- Validación de entrada con DTOs (`class-validator` + `class-transformer`)
- Seguridad básica: `helmet`, CORS y `ValidationPipe` (whitelist)
- **Docker Compose** para PostgreSQL + API (desarrollo y producción)
- Tests unitarios (Jest) y e2e (Jest + supertest)
- Linting con **ESLint 9** (flat config) + **Prettier**

## Stack y versiones

| Herramienta     | Versión  |
| --------------- | -------- |
| Node.js         | >= 20 (recomendado 24 LTS) |
| NestJS          | 11.x     |
| TypeORM         | 1.x      |
| PostgreSQL      | 16       |
| @nestjs/swagger | 11.x     |
| Jest            | 30.x     |
| TypeScript      | 5.x      |

## Requisitos

- Node.js >= 20
- npm (>= 10)
- Docker + Docker Compose (opcional, recomendado)

## Configuración rápida

1. Instalar dependencias:

```bash
$ npm install
```

2. Crear el archivo de entorno:

```bash
$ cp .env.example .env
```

3. Levantar la base de datos y la API:

```bash
$ docker compose up
```

La API quedará disponible en `http://localhost:3000/api` y la documentación en `http://localhost:3000/docs`.

## Variables de entorno

Todas las variables se validan al arrancar (la aplicación no inicia si falta alguna o es inválida).

| Variable             | Descripción                        | Valor por defecto        |
| -------------------- | ---------------------------------- | ------------------------ |
| `NODE_ENV`           | Entorno (`development` / `production` / `test`) | `development` |
| `PORT`               | Puerto del servidor                | `3000`                   |
| `API_PREFIX`         | Prefijo global de la API           | `api`                    |
| `SWAGGER_ENABLED`    | Habilita/deshabilita Swagger       | `true`                   |
| `SWAGGER_TITLE`      | Título de la documentación         | `API de Prueba Técnica`  |
| `SWAGGER_DESCRIPTION`| Descripción de la documentación    | `Documentación de la API en español` |
| `SWAGGER_VERSION`    | Versión de la API                  | `1.0.0`                  |
| `SWAGGER_PATH`       | Ruta de la documentación           | `docs`                   |
| `DB_HOST`            | Host de PostgreSQL                 | `localhost`              |
| `DB_PORT`            | Puerto de PostgreSQL               | `5432`                   |
| `DB_USERNAME`        | Usuario de PostgreSQL              | `prueba`                 |
| `DB_PASSWORD`        | Contraseña de PostgreSQL           | `prueba`                 |
| `DB_DATABASE`        | Nombre de la base de datos         | `prueba_tecnica`         |
| `JWT_SECRET`         | Secreto para firmar los JWT        | *(cambiar en producción)* |
| `JWT_EXPIRES_IN`     | Expiración del token               | `1h`                     |

## Ejecución

### Desarrollo (requiere PostgreSQL)

Todo junto con hot reload (Docker):

```bash
$ docker compose up
```

O bien solo la base de datos en Docker y la API en local:

```bash
$ docker compose up -d postgres
$ npm run start:dev
```

### Producción

```bash
$ docker compose -f docker-compose.yml up -d --build
```

## Documentación de la API (Swagger en español)

Una vez la API esté corriendo, tienes disponibles:

- **Swagger UI (interfaz interactiva):** `http://localhost:3000/docs`
- **Especificación OpenAPI en JSON:** `http://localhost:3000/docs-json`
- **Especificación OpenAPI en YAML:** `http://localhost:3000/docs-yaml`

La interfaz incluye un botón `Authorize` para pegar el token JWT y probar los endpoints protegidos.

### Archivo `openapi.yaml`

En la raíz del repositorio se incluye el archivo **`openapi.yaml`** con la especificación completa de la API. Puedes:

1. Importarlo en **Swagger Editor** (https://editor.swagger.io), **Stoplight** o **Redocly** para navegar la documentación sin levantar el servidor.
2. Importarlo en **Postman**, **Insomnia** o **Bruno** para generar automáticamente la colección de peticiones.

#### Regenerar el archivo YAML

Si modificas los endpoints o DTOs, regenera la especificación con:

```bash
$ docker compose up -d postgres   # el script necesita la base de datos
$ npm run swagger:generate
```

Esto actualiza el archivo `openapi.yaml` en la raíz del proyecto.

## Endpoints

### Autenticación

| Método | Ruta                | Descripción                                    | Auth     |
| ------ | ------------------- | ---------------------------------------------- | -------- |
| POST   | `/api/auth/register`| Crea un usuario (contraseña cifrada)           | No       |
| POST   | `/api/auth/login`   | Valida credenciales y devuelve `accessToken`   | No       |
| GET    | `/api/auth/profile` | Devuelve el usuario autenticado                | Bearer   |

### Otros

| Método | Ruta   | Descripción               |
| ------ | ------ | ------------------------- |
| GET    | `/api` | Mensaje de bienvenida     |

### Ejemplo de uso con `curl`

```bash
# 1. Registrarse
$ curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","password":"Contraseña123!"}'

# 2. Iniciar sesión y obtener el token
$ curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","password":"Contraseña123!"}'
```

Los mensajes de error y las descripciones de Swagger están en **español** (p. ej. `Credenciales inválidas`, `Token inválido o expirado`).

## Docker

### Desarrollo (hot reload)

```bash
$ docker compose up
```

Levanta tres servicios: `postgres` (PostgreSQL 16), `api` (NestJS en modo watch) y `pgweb` (cliente web para la base de datos).

### Base de datos (pgweb)

pgweb queda disponible en `http://localhost:8080` y entra **directo, sin usuario ni contraseña**: la conexión se configura automáticamente desde tu `.env` (usa las mismas credenciales de `DB_*`). Puedes explorar tablas, lanzar queries SQL y exportar resultados.

### Producción

```bash
$ docker compose -f docker-compose.yml up -d --build
```

## Tests

Los tests e2e requieren PostgreSQL corriendo:

```bash
$ docker compose up -d postgres

# Tests unitarios
$ npm run test

# Tests e2e
$ npm run test:e2e
```

## Estructura

Cada módulo sigue la misma estructura de carpetas:

```
prueba-tecnica/
├── scripts/
│   └── generate-swagger.ts      # Genera openapi.yaml
├── openapi.yaml                 # Especificación OpenAPI de la API (español)
├── src/
│   ├── common/
│   │   └── config/
│   │       └── env.validation.ts # Validación de variables de entorno
│   ├── auth/                     # Autenticación (JWT + PostgreSQL)
│   │   ├── model/                # Entidad User y tipos del JWT
│   │   ├── services/             # AuthService, JwtAuthGuard (+ tests)
│   │   ├── controller/           # AuthController
│   │   ├── dto/                  # RegisterDto y LoginDto
│   │   └── interceptors/         # SanitizeUserInterceptor (quita el password)
│   ├── app.module.ts             # Módulo raíz (Config, TypeORM, Auth)
│   └── main.ts                   # Bootstrap: prefijo, pipes, helmet, Swagger
└── test/
    └── app.e2e-spec.ts           # Tests e2e
```

## Nota sobre el lockfile

`package.json` incluye `overrides` para `@napi-rs/wasm-runtime` y `@emnapi/*` con el fin de resolver un bug de npm 11 que rompe `npm ci` en entornos Linux/alpine (Docker) con las dependencias opcionales de `unrs-resolver` (usado por Jest para resolución de módulos).
