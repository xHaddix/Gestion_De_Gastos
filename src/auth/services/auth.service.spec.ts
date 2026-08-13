import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../model/user.entity';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcryptHashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const bcryptCompareMock = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<
    Pick<
      Repository<User>,
      'findOneBy' | 'create' | 'save' | 'createQueryBuilder'
    >
  >;
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    userRepository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    jwtService = { signAsync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registra un usuario cifrando su contraseña', async () => {
    bcryptHashMock.mockResolvedValue('contraseña-cifrada');
    userRepository.findOneBy.mockResolvedValue(null);
    userRepository.create.mockImplementation((dto: Partial<User>) => ({
      ...dto,
    }));
    userRepository.save.mockImplementation((user: User) =>
      Promise.resolve({ id: 1, ...user }),
    );

    const result = await service.register({
      email: 'usuario@example.com',
      password: 'Contraseña123!',
    });

    expect(bcryptHashMock).toHaveBeenCalledWith('Contraseña123!', 10);
    expect(userRepository.save).toHaveBeenCalled();
    expect(result).toEqual({
      id: 1,
      email: 'usuario@example.com',
      password: 'contraseña-cifrada',
      name: null,
    });
  });

  it('rechaza un correo duplicado con conflicto (409)', async () => {
    userRepository.findOneBy.mockResolvedValue({
      id: 1,
      email: 'usuario@example.com',
      name: null,
    } as User);

    await expect(
      service.register({
        email: 'usuario@example.com',
        password: 'Contraseña123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('devuelve un accessToken cuando las credenciales son válidas', async () => {
    const user = {
      id: 1,
      email: 'usuario@example.com',
      password: 'contraseña-cifrada',
      name: null,
    } as User;

    userRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    } as never);
    bcryptCompareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('token-123');

    const result = await service.login({
      email: 'usuario@example.com',
      password: 'Contraseña123!',
    });

    expect(result.accessToken).toBe('token-123');
    expect(result.user.email).toBe('usuario@example.com');
    expect(bcryptCompareMock).toHaveBeenCalledWith(
      'Contraseña123!',
      'contraseña-cifrada',
    );
  });

  it('rechaza credenciales incorrectas (401)', async () => {
    userRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 1,
        email: 'usuario@example.com',
        password: 'contraseña-cifrada',
        name: null,
      }),
    } as never);
    bcryptCompareMock.mockResolvedValue(false);

    await expect(
      service.login({
        email: 'usuario@example.com',
        password: 'Incorrecta123!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('obtiene el perfil de un usuario existente', async () => {
    const user = {
      id: 1,
      email: 'usuario@example.com',
      name: 'Juan',
    } as User;
    userRepository.findOneBy.mockResolvedValue(user);

    await expect(service.getProfile(1)).resolves.toEqual(user);
  });

  it('lanza 404 si el usuario del perfil no existe', async () => {
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(service.getProfile(99)).rejects.toThrow(NotFoundException);
  });
});
