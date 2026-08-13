import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@example.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'Juan Pérez',
    description: 'Nombre del usuario',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: 'Contraseña123!',
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
