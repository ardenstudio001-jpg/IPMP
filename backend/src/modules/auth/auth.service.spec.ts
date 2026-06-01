import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assigns default procurement role during registration', async () => {
    const registerDto = {
      email: 'user@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    jest
      .spyOn(bcrypt, 'hash')
      .mockResolvedValueOnce('hashed-password' as never)
      .mockResolvedValueOnce('hashed-refresh-token' as never);
    prismaService.user.findUnique.mockResolvedValue(null);
    prismaService.user.create.mockResolvedValue({
      id: 'user-123',
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: Role.PROCUREMENT,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    prismaService.user.update.mockResolvedValue({});

    const response = await service.register(registerDto);

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: registerDto.email },
    });
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        email: registerDto.email,
        password: 'hashed-password',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: Role.PROCUREMENT,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        password: false,
      },
    });
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { refreshToken: 'hashed-refresh-token' },
    });
    expect(response.user.role).toBe(Role.PROCUREMENT);
    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('refresh-token');
  });
});
