import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguagesService } from './languages.service';

describe('LanguagesService', () => {
  const prismaMock = {
    project: {
      findUnique: jest.fn(),
    },
    language: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const txMock = {
    language: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      updateMany: jest.fn(),
    },
    analysisReport: {
      deleteMany: jest.fn(),
    },
  };

  const service = new LanguagesService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
    });

    prismaMock.language.findFirst = jest.fn().mockResolvedValue({
      id: 'lang-es',
    });

    txMock.language.create.mockResolvedValue({
      id: 'lang-es',
      projectId: 'project-1',
      code: 'es',
      name: 'Spanish',
    });

    txMock.language.findFirst.mockResolvedValue({
      id: 'lang-en',
    });

    txMock.project.updateMany.mockResolvedValue({ count: 1 });
    txMock.analysisReport.deleteMany.mockResolvedValue({ count: 0 });
    txMock.language.delete.mockResolvedValue({ id: 'lang-es' });

    prismaMock.$transaction = jest
      .fn()
      .mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );
  });

  it('sets first created language as reference when project has no reference', async () => {
    const created = await service.create('project-1', {
      code: 'ES',
      name: 'Spanish',
    });

    expect(txMock.language.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        code: 'es',
        name: 'Spanish',
      },
    });

    expect(txMock.project.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
        referenceLanguageId: null,
      },
      data: {
        referenceLanguageId: 'lang-es',
      },
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 'lang-es',
        code: 'es',
      }),
    );
  });

  it('reassigns project reference when deleting the current reference language', async () => {
    await service.remove('project-1', 'lang-es');

    expect(txMock.language.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
        id: {
          not: 'lang-es',
        },
      },
      orderBy: {
        code: 'asc',
      },
      select: {
        id: true,
      },
    });

    expect(txMock.project.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'project-1',
        OR: [
          {
            referenceLanguageId: 'lang-es',
          },
          {
            referenceLanguageId: null,
          },
        ],
      },
      data: {
        referenceLanguageId: 'lang-en',
      },
    });
  });

  it('throws when language does not belong to project', async () => {
    prismaMock.language.findFirst = jest.fn().mockResolvedValue(null);

    await expect(
      service.remove('project-1', 'lang-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
