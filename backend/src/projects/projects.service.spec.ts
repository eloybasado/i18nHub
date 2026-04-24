import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const prismaMock = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const txMock = {
    project: {
      update: jest.fn(),
    },
    projectMember: {
      upsert: jest.fn(),
    },
  };

  const service = new ProjectsService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      ownerId: 'owner-1',
    });

    prismaMock.user.findUnique = jest.fn().mockResolvedValue({
      id: 'member-1',
    });

    prismaMock.projectMember.upsert = jest.fn().mockResolvedValue({
      id: 'membership-1',
      projectId: 'project-1',
      userId: 'member-1',
      role: ProjectRole.EDITOR,
    });

    prismaMock.projectMember.findUnique = jest.fn().mockResolvedValue({
      id: 'membership-1',
    });

    prismaMock.projectMember.update = jest.fn().mockResolvedValue({
      id: 'membership-1',
      role: ProjectRole.VIEWER,
    });

    prismaMock.projectMember.deleteMany = jest.fn().mockResolvedValue({
      count: 1,
    });

    txMock.project.update.mockResolvedValue({
      id: 'project-1',
      ownerId: 'member-2',
    });
    txMock.projectMember.upsert.mockResolvedValue({});

    prismaMock.$transaction = jest
      .fn()
      .mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );
  });

  it('adds member by normalized email', async () => {
    await service.addMember('project-1', {
      email: ' MEMBER@MAIL.COM ',
      role: ProjectRole.EDITOR,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'member@mail.com',
      },
      select: {
        id: true,
      },
    });

    expect(prismaMock.projectMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_userId: {
            projectId: 'project-1',
            userId: 'member-1',
          },
        },
      }),
    );
  });

  it('throws when assigning OWNER role through add member endpoint', async () => {
    await expect(
      service.addMember('project-1', {
        email: 'member@mail.com',
        role: ProjectRole.OWNER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when user email does not exist', async () => {
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.addMember('project-1', {
        email: 'missing@mail.com',
        role: ProjectRole.EDITOR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists project members with normalized owner role and role ordering', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      ownerId: 'owner-1',
      members: [
        {
          userId: 'viewer-1',
          role: ProjectRole.VIEWER,
          user: {
            email: 'viewer@mail.com',
            name: 'Ana',
          },
        },
        {
          userId: 'owner-1',
          role: ProjectRole.EDITOR,
          user: {
            email: 'owner@mail.com',
            name: 'Zoe',
          },
        },
        {
          userId: 'editor-1',
          role: ProjectRole.EDITOR,
          user: {
            email: 'editor@mail.com',
            name: 'Beto',
          },
        },
      ],
    });

    const members = await service.listMembers('project-1');

    expect(members).toEqual([
      {
        userId: 'owner-1',
        email: 'owner@mail.com',
        name: 'Zoe',
        role: ProjectRole.OWNER,
        isOwner: true,
      },
      {
        userId: 'editor-1',
        email: 'editor@mail.com',
        name: 'Beto',
        role: ProjectRole.EDITOR,
        isOwner: false,
      },
      {
        userId: 'viewer-1',
        email: 'viewer@mail.com',
        name: 'Ana',
        role: ProjectRole.VIEWER,
        isOwner: false,
      },
    ]);
  });

  it('updates member role when target is not owner', async () => {
    await service.updateMemberRole('project-1', 'member-1', {
      role: ProjectRole.VIEWER,
    });

    expect(prismaMock.projectMember.update).toHaveBeenCalledWith({
      where: {
        projectId_userId: {
          projectId: 'project-1',
          userId: 'member-1',
        },
      },
      data: {
        role: ProjectRole.VIEWER,
      },
    });
  });

  it('throws when trying to change current owner role', async () => {
    await expect(
      service.updateMemberRole('project-1', 'owner-1', {
        role: ProjectRole.EDITOR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when trying to remove current owner', async () => {
    await expect(service.removeMember('project-1', 'owner-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows non-owner member to leave project', async () => {
    const result = await service.leaveProject('project-1', 'member-1');

    expect(prismaMock.projectMember.deleteMany).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
        userId: 'member-1',
      },
    });
    expect(result).toEqual({ left: true });
  });

  it('throws when owner tries to leave project', async () => {
    await expect(service.leaveProject('project-1', 'owner-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when transfer ownership is requested by non-owner', async () => {
    await expect(
      service.transferOwnership('project-1', 'editor-1', {
        newOwnerUserId: 'member-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('transfers ownership and normalizes memberships in one transaction', async () => {
    prismaMock.projectMember.findUnique = jest.fn().mockResolvedValue({
      id: 'membership-member-2',
    });

    const updatedProject = await service.transferOwnership('project-1', 'owner-1', {
      newOwnerUserId: 'member-2',
    });

    expect(txMock.project.update).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
      },
      data: {
        ownerId: 'member-2',
      },
    });

    expect(txMock.projectMember.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          projectId_userId: {
            projectId: 'project-1',
            userId: 'member-2',
          },
        },
        update: {
          role: ProjectRole.OWNER,
        },
      }),
    );

    expect(txMock.projectMember.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          projectId_userId: {
            projectId: 'project-1',
            userId: 'owner-1',
          },
        },
        update: {
          role: ProjectRole.EDITOR,
        },
      }),
    );

    expect(updatedProject).toEqual({
      id: 'project-1',
      ownerId: 'member-2',
    });
  });
});
