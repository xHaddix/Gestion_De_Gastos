import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  API_PREFIX!: string;

  @IsBoolean()
  SWAGGER_ENABLED!: boolean;

  @IsString()
  SWAGGER_TITLE!: string;

  @IsString()
  SWAGGER_DESCRIPTION!: string;

  @IsString()
  SWAGGER_VERSION!: string;

  @IsString()
  SWAGGER_PATH!: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @IsInt()
  @Min(1)
  DB_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE!: string;

  @IsString()
  @IsNotEmpty()
  S3_ENDPOINT!: string;

  @IsOptional()
  @IsString()
  S3_PUBLIC_ENDPOINT?: string;

  @IsString()
  @IsNotEmpty()
  S3_REGION!: string;

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  S3_BUCKET!: string;

  @IsOptional()
  @IsString()
  LLM_API_KEY?: string;

  @IsOptional()
  @IsString()
  LLM_BASE_URL?: string;

  @IsOptional()
  @IsString()
  LLM_MODEL?: string;

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  GEMINI_MODEL?: string;

  @IsOptional()
  @IsString()
  TESSDATA_PATH?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
