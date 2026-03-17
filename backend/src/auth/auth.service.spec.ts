import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GlobalRole, Tier } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return 'secret';
    }),
  } as unknown as ConfigService;

  const service = new AuthService(
    prismaMock,
    jwtServiceMock,
    configServiceMock,
  );

  const baseUser = {
    id: 'user-1',
    email: 'test@i18nhub.dev',
    name: 'Test User',
    role: GlobalRole.MEMBER,
    tier: Tier.FREE,
    passwordHash: 'hashed-password',
    refreshTokenHash: 'stored-refresh-hash',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('register creates user and returns tokens', async () => {
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(null);
    prismaMock.user.create = jest.fn().mockResolvedValue(baseUser);
    prismaMock.user.update = jest.fn().mockResolvedValue(baseUser);

    (jwtServiceMock.signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    (bcrypt.hash as jest.Mock)
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh');

    const result = await service.register({
      email: 'TEST@I18NHUB.DEV',
      name: 'Test User',
      password: 'password123',
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'test@i18nhub.dev' }),
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('register throws when email already exists', async () => {
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(baseUser);

    await expect(
      service.register({
        email: 'test@i18nhub.dev',
        name: 'Test User',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refresh throws when provided token does not match stored hash', async () => {
    (jwtServiceMock.verifyAsync as jest.Mock).mockResolvedValue({
      sub: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
      tier: baseUser.tier,
    });
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(baseUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.refresh('bad-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
