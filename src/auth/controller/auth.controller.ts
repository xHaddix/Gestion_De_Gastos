import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { SanitizeUserInterceptor } from '../interceptors/sanitize-user.interceptor';
import type { JwtPayload } from '../model/jwt-payload';
import { User } from '../model/user.entity';
import { AuthService, LoginResult } from '../services/auth.service';
import { JwtAuthGuard } from '../services/jwt-auth.guard';

@ApiTags('Autenticación')
@Controller('auth')
@UseInterceptors(SanitizeUserInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado correctamente',
    type: User,
  })
  @ApiConflictResponse({
    description: 'El correo electrónico ya está registrado',
  })
  register(@Body() registerDto: RegisterDto): Promise<User> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión y obtener un token de acceso JWT',
  })
  @ApiOkResponse({
    description: 'Inicio de sesión correcto',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          description: 'Token de acceso JWT',
        },
        user: { $ref: '#/components/schemas/User' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(@Body() loginDto: LoginDto): Promise<LoginResult> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({
    description: 'Usuario autenticado',
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticación faltante, inválido o expirado',
  })
  profile(@CurrentUser() user: JwtPayload): Promise<User> {
    return this.authService.getProfile(user.sub);
  }
}
