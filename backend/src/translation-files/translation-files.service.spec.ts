import { BadRequestException, NotFoundException } from '@nestjs/common';
import { I18nPattern } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationFilesService } from './translation-files.service';

describe('TranslationFilesService', () => {
  const prismaMock = {
    project: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const txMock = {
    fileGroup: {
      upsert: jest.fn(),
    },
    translationFile: {
      upsert: jest.fn(),
    },
  };

  const service = new TranslationFilesService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ingest stores files in default group for SINGLE_FILE pattern', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.SINGLE_FILE,
      languages: [
        { id: 'lang-es', code: 'es' },
        { id: 'lang-en', code: 'en' },
      ],
    });

    txMock.fileGroup.upsert.mockResolvedValue({
      id: 'group-default',
      name: 'default',
    });
    txMock.translationFile.upsert.mockResolvedValue({});

    prismaMock.$transaction = jest
      .fn()
      .mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );

    const result = await service.ingest('project-1', {
      files: [
        { path: 'locales/es.json', content: { home: { title: 'Hola' } } },
        { path: 'locales/en.json', content: { home: { title: 'Hello' } } },
      ],
    });

    expect(txMock.fileGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_name: {
            projectId: 'project-1',
            name: 'default',
          },
        },
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        filesIngested: 2,
        fileGroupsAffected: 1,
        pattern: I18nPattern.SINGLE_FILE,
      }),
    );
  });

  it('ingest throws when file language does not exist in project', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.SINGLE_FILE,
      languages: [{ id: 'lang-es', code: 'es' }],
    });

    await expect(
      service.ingest('project-1', {
        files: [
          { path: 'locales/en.json', content: { home: { title: 'Hello' } } },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ingest throws when project does not exist', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.ingest('missing-project', {
        files: [{ path: 'locales/es.json', content: { x: 'y' } }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
