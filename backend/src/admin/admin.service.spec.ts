import { NotFoundException } from '@nestjs/common';
import { GlobalRole, Tier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prismaMock = {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new AdminService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists users with project counters', async () => {
    prismaMock.user.findMany = jest.fn().mockResolvedValue([
      {
        id: 'user-1',
        email: 'admin@i18nhub.local',
        name: 'Admin',
        role: GlobalRole.ADMIN,
        tier: Tier.PRO,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        _count: {
          ownedProjects: 2,
          projectMemberships: 3,
        },
      },
    ]);

    const users = await service.listUsers();

    expect(users).toEqual([
      expect.objectContaining({
        id: 'user-1',
        role: GlobalRole.ADMIN,
        tier: Tier.PRO,
        ownedProjectsCount: 2,
        membershipsCount: 3,
      }),
    ]);
  });

  it('updates user tier and clears refresh token', async () => {
    prismaMock.user.update = jest.fn().mockResolvedValue({
      id: 'user-2',
      email: 'member@i18nhub.local',
      name: 'Member',
      role: GlobalRole.MEMBER,
      tier: Tier.PRO,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      _count: {
        ownedProjects: 0,
        projectMemberships: 1,
      },
    });

    const user = await service.updateUserTier('user-2', { tier: Tier.PRO });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-2' },
        data: {
          tier: Tier.PRO,
          refreshTokenHash: null,
        },
      }),
    );
    expect(user.tier).toBe(Tier.PRO);
  });

  it('throws when updating a missing project', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.updateProject('project-1', {
        name: 'Nuevo nombre',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
